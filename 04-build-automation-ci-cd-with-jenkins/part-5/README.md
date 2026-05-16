# Dynamically Increment Application Version in Jenkins Pipeline

## Overview

In this project, I configured a Jenkins Multibranch Pipeline that automatically increments the patch version of a Java application on every run. The pipeline runs the test suite, packages the JAR, builds and pushes a versioned Docker image to a private registry, and commits the updated version back to the source branch. This provides a fully automated, traceable versioning workflow.

The pipeline runs against the `feat/dynamic-image-versioning` branch of the project, which contains the updated `Jenkinsfile`.

## Technologies Used

- **CI/CD Tool:** Jenkins (Multibranch Pipeline)
- **Build Tool:** Maven
- **Containerization:** Docker
- **Version Control:** GitHub
- **Scripting Language:** Groovy

## Prerequisites

- A Multibranch Pipeline project configured in Jenkins (covered in this [project](https://github.com/brice-tossim/twn-devops-bootcamp/blob/main/08-build-automation-ci-cd-with-jenkins/part-2/4_multibranch_pipeline_project.md)).
- GitHub and Docker registry credentials previously set in the Jenkins credential store (covered in this [project](https://github.com/brice-tossim/twn-devops-bootcamp/blob/main/08-build-automation-ci-cd-with-jenkins/part-2/1_general_config.md)).
- The [Ignore Committer Strategy](https://plugins.jenkins.io/ignore-committer-strategy/) plugin installed in Jenkins. This plugin prevents an infinite webhook trigger loop that would otherwise occur because the pipeline commits back to the same branch that triggered it.

## Multibranch Pipeline Configuration

To prevent the trigger loop, the `Ignore Committer Strategy` plugin must be configured under the build strategies of the Multibranch Pipeline:

- Navigated to the Multibranch Pipeline configuration page.
- Under "Build strategies", added the "Ignore Committer Strategy".
- Filled the following fields:
  - **List of author emails to ignore:** Added a dedicated email (e.g., `<your-jenkins-email>`). This email will also be used as the Git committer email inside the Jenkinsfile.
  - **Allow builds when a changeset contains non-ignored author(s):** Ticked.
  - **Check only HEAD (latest commit):** Ticked.
- Saved the configuration.

The mechanism works as follows: when the pipeline commits the version change, it does so as the configured Jenkins email. On the next webhook delivery, the plugin sees that the only committer is the ignored email and skips the build, breaking the loop.

Note 1: The same email must be used in both the build strategy configuration and the `git config user.email` step inside the Jenkinsfile. If the two values do not match, the plugin will not recognize the commit as ignored and the loop will not be prevented.

Note 2: The "Check only HEAD (latest commit)" option may not be available depending on the Jenkins version. It is present in Jenkins `2.555.1`.

## Jenkinsfile

The full pipeline script is located in the `feat/dynamic-image-versioning` branch of the project repository:

```groovy
pipeline {
    agent any

    environment {
        IMAGE_NAME = "kn84k2nh/java-maven-app"
    }

    stages {
        stage('Increment patch version') {
            steps {
                script {
                    echo "Incrementing patch version..."
                    sh '''
                        mvn build-helper:parse-version versions:set \
                            -DnewVersion=\\\${parsedVersion.majorVersion}.\\\${parsedVersion.minorVersion}.\\\${parsedVersion.nextIncrementalVersion} \
                            versions:commit
                    '''
                    def version = sh(
                        script: "mvn help:evaluate -Dexpression=project.version -q -DforceStdout",
                        returnStdout: true
                    ).trim()

                    env.IMAGE_VERSION = "$version-$BUILD_NUMBER"
                }
            }
        }
        stage('Run tests') {
            steps {
                echo 'Running tests...'
                sh 'mvn test'
            }
        }
        stage('Build JAR') {
            steps {
                echo 'Building the jar file...'
                sh 'mvn clean package'
            }
        }
        stage('Build and push docker image') {
            steps {
                script {
                    env.FULL_IMAGE_NAME = "$IMAGE_NAME:$IMAGE_VERSION"

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'docker-access',
                            usernameVariable: 'DOCKER_USERNAME',
                            passwordVariable: 'DOCKER_PASSWORD'
                        )]) {
                            sh '''
                                echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
                                docker build -t $FULL_IMAGE_NAME .
                                docker push $FULL_IMAGE_NAME
                            '''
                        }
                }
            }
        }
        stage('Commit version change') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-access',
                        usernameVariable: 'GITHUB_USERNAME',
                        passwordVariable: 'GITHUB_TOKEN'
                    )]) {
                        sh '''
                            git remote set-url origin https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com/$GITHUB_USERNAME/<your-repo-name>.git
                            git config user.name "Jenkins"
                            git config user.email "<your-jenkins-email>"
                            git add pom.xml
                            git commit -m "Increment patch version"
                            git push origin HEAD:feat/dynamic-image-versioning
                        '''
                    }
            }
        }
    }
}
```

Note 1: The triple-escaped `\\\$` in the Maven command is intentional. It is required because the `sh` step uses Groovy single-quoted strings, which need additional escaping to preserve the literal `${...}` syntax that Maven evaluates at runtime.

Note 2: Replace `<your-repo-name>` with the name of the project repository, and `<your-jenkins-email>` with the email configured in the "List of author emails to ignore" field. Both values must match across the build strategy and the Jenkinsfile.

## Stage Breakdown

- **Increment patch version:** Uses the Maven `build-helper-maven-plugin` to increment the patch component of the project's version (e.g., `1.1.1` → `1.1.2`) and commits the change to the local `pom.xml`. The new version is then read back via `mvn help:evaluate` and concatenated with the Jenkins `$BUILD_NUMBER` to produce a unique image tag stored in `IMAGE_VERSION`.

- **Run tests:** Executes the project's test suite using `mvn test`.

- **Build JAR:** Runs `mvn clean package` to produce a fresh JAR file. The `clean` goal ensures that older build artifacts are removed so that the resulting Docker image only contains the latest JAR.

- **Build and push Docker image:** Builds the Docker image using the dynamic `IMAGE_VERSION` as the tag and pushes it to the private Docker registry, authenticating with the Jenkins-stored Docker credentials.

- **Commit version change:** Pushes the updated `pom.xml` back to the `feat/dynamic-image-versioning` branch so that the next pipeline run starts from the latest version. The commit is authored by the Jenkins email configured in the `Ignore Committer Strategy`, which prevents the push from triggering a new build.

## Troubleshooting

- **Problem: The pipeline triggers itself in an infinite loop after each run**

  This happens when the version-change commit pushed by Jenkins triggers the webhook, which in turn triggers a new pipeline run. To fix this, ensure that:
  - The [Ignore Committer Strategy](https://plugins.jenkins.io/ignore-committer-strategy/) plugin is installed.
  - The plugin is configured under the "Build strategies" section of the Multibranch Pipeline.
  - The email defined in the "List of author emails to ignore" field exactly matches the email used in the `git config user.email` step inside the Jenkinsfile.
