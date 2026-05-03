# Create a Jenkins Shared Library

## Overview

In this project, I created a Jenkins Shared Library to centralize and reuse common pipeline steps across multiple Jenkins jobs. The shared library hosts custom Groovy steps in a dedicated repository, which can then be loaded globally or locally by any Jenkins pipeline, reducing duplication and improving maintainability.

## Technologies Used

- **CI/CD Tool:** Jenkins
- **Version Control:** GitHub
- **Scripting Language:** Groovy

## Prerequisites

- A Jenkins server with a configured Source Code Management (SCM) credential. This credential will be used by Jenkins to clone the shared library repository.

## Shared Library Repository Structure

The shared library is hosted in a dedicated repository on a source code management platform (e.g., GitHub). The official directory structure is documented [here](https://www.jenkins.io/doc/book/pipeline/shared-libraries/) and consists of three top-level folders:

- `vars/`: Holds the global custom steps exposed to pipelines. Each file in this folder defines a single step and is named in `camelCase.groovy`. The file name is what the pipeline calls.
- `src/`: Holds standard Groovy source code following the Java/Groovy package layout. Useful for defining classes and helper utilities.
- `resources/`: Holds non-Groovy resource files (e.g., JSON, YAML templates) that custom steps can load using `libraryResource`.

For this project, I only used the `vars/` folder. A working example is available in this [repository](https://github.com/brice-tossim/twn-jenkins-shared-library).

## Defining a Custom Step

Each custom step is defined as a Groovy file in the `vars/` folder. The file name (in `camelCase`) becomes the name of the step used in the Jenkinsfile.

A minimal step looks like this:

```groovy
#!/usr/bin/env groovy

def call() {
    // Instructions
}
```

Custom steps can also accept parameters by extending the `call()` method signature. For example, a step that takes a credentials ID and an image name would be defined as:

```groovy
#!/usr/bin/env groovy

def call(String registry, String imageName) {
    // Instructions using registry and imageName
}
```

The corresponding pipeline call would then be `buildAndPushDockerImage('my-registry', 'java-maven-app:latest')`.

## Library Configuration on Jenkins

Once the repository is created and pushed, the library can be configured in Jenkins either globally or locally.

### Global Configuration

A globally configured library is available to all Jenkins pipelines. To configure it:

- Navigated to "Manage Jenkins" > "System".
- Located the "Global Trusted Pipeline Libraries" section and clicked "Add".
- Set the following values:
  - **Name:** Any identifier (will be referenced from pipelines).
  - **Retrieval method:** Modern SCM
  - **Source Code Management:** Selected the SCM provider hosting the library (e.g., GitHub).
  - **Credentials:** Selected the SCM credential previously configured in Jenkins.
  - **Repository URL:** The URL of the shared library repository.
- Saved the configuration.

A pipeline using a globally configured library would look like this:

```groovy
#!/usr/bin/env groovy

@Library('THE_NAME_OF_YOUR_GLOBAL_LIBRARY')_

pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                runTests()
            }
        }
        stage('Build jar') {
            steps {
                buildJar()
            }
        }
        stage('Build and push docker image') {
            steps {
                buildAndPushDockerImage('kn84k2nh', 'java-maven-app:latest')
            }
        }
    }
}
```

Note 1: The trailing underscore after `@Library('...')_` is required when the next non-empty line is the `pipeline` declaration.

Note 2: The trailing underscore is only needed when the next line is the `pipeline` declaration. If the next line is any other Groovy statement (e.g., a `def` declaration to use the library for something else), the underscore is not needed.

Note 3: Each step called in the pipeline (e.g., `runTests()`, `buildJar()`, `buildAndPushDockerImage()`) must correspond to a Groovy file in the `vars/` folder of the shared library (e.g., `runTests.groovy`, `buildJar.groovy`, `buildAndPushDockerImage.groovy`).

### Local Configuration

A locally configured library is loaded directly from the Jenkinsfile and does not require any setup in the Jenkins system configuration. The library is declared inline at the top of the pipeline:

```groovy
#!/usr/bin/env groovy

library identifier: 'A_NAME_AS_AN_IDENTIFIER@A_VERSION', retriever: modernSCM([
    $class: 'GitSCMSource',
    remote: 'YOUR_REPO_URL',
    credentialsId: 'THE_JENKINS_CREDENTIALS_OF_YOUR_SCM'
])

pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                runTests()
            }
        }
        stage('Build jar') {
            steps {
                buildJar()
            }
        }
        stage('Build and push docker image') {
            steps {
                buildAndPushDockerImage('kn84k2nh', 'java-maven-app:latest')
            }
        }
    }
}
```

Note: The `identifier` field uses the format `name@version`, where `name` can be any identifier and `version` can be a branch name, a tag, or a commit hash of the shared library to load.
