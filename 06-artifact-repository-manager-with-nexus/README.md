# Run Nexus on Droplet and Publish Artifacts to Nexus

## Overview

In this project, I installed and configured Nexus Repository Manager on a DigitalOcean Droplet to host a private artifact repository for Java applications.

I also created a dedicated Nexus user with the required permissions and published JAR artifacts from both Gradle and Maven projects to the hosted snapshot repository.

## Technologies used

- **Repository Manager:** Nexus
- **Cloud Provider:** DigitalOcean
- **Operating System:** Linux
- **Build Tools:** Gradle, Maven
- **Runtime:** Java 21

## Infrastructure details

- Provisioned a Linux-based DigitalOcean Droplet (Ubuntu 24.04 LTS x64) to run nexus Repository Manager.
- Installed nexus 3.90.2 under `/opt` and ran it with a dedicated nexus system user.
- Used the server as a private Maven snapshot repository for publishing Java build artifacts from separate Gradle and Maven projects.
- Allocated 8 GB RAM, 4 vCPUs, and 160 GB storage for the environment.

## Nexus setup

- Created an admin user for server management and a separate `nexus` user to run the nexus service with the appropriate ownership on `/opt/nexus` and `/opt/sonatype-work`. This process was previously covered in this [project](https://github.com/brice-tossim/twn-devops-bootcamp/tree/main/05-cloud-and-infrastructure-as-service-basics/project-1).
- Downloaded, extracted, and started nexus from `/opt`, then verified that the Java process was listening on the expected port.
- The following commands were executed using the admin user, not the root user:

```sh
sudo apt update
cd /opt
sudo wget https://download.sonatype.com/nexus/3/nexus-3.90.2-06-linux-x86_64.tar.gz
sudo tar -xvzf nexus-3.90.2-06-linux-x86_64.tar.gz
sudo mv nexus-3.90.2-06 nexus
sudo chown -R nexus:nexus /opt/nexus
sudo chown -R nexus:nexus /opt/sonatype-work
sudo -u nexus bash -c "/opt/nexus/bin/nexus start"
sudo ss -lpnt | grep java
```

Reference: [Install doc](https://help.sonatype.com/en/install-nexus-repository.html)

## Nexus user configuration

- Created a custom nexus role for Java artifact publishing with `"nx-repository-view-maven2-maven-snapshots-*"` privileges.
- Created a nexus user, for example `java-user`, and assigned the custom role for authenticated artifact publishing from Gradle and Maven projects.

Note: `"nx-repository-view-maven2-maven-releases-*"` can also be added if release artifact publishing is needed.

## Gradle publishing

- Added the following configuration to the `build.gradle` file of the Gradle project to enable publishing artifacts to the nexus snapshot repository.

```java
apply plugin: 'maven-publish'

publishing {
    publications {
        maven(MavenPublication) {
            artifact("build/libs/my-app-$version"+".jar"){
                extension 'jar'
            }
        }
    }

    repositories {
        maven {
            name 'nexus'
            url "http://<nexus-ip>:<nexus-port>/repository/maven-snapshots/" 
            allowInsecureProtocol = true
            credentials {
                username project.repoUser
                password project.repoPassword
            }
        }
    }
}
```

- Defined `project.repoUser` and `project.repoPassword` in `gradle.properties` using the Nexus user credentials created earlier.
- Built and published the artifact with:

```sh
gradle build
gradle publish
```

Note: Remember to replace `<nexus-ip>` and `<nexus-port>` with the nexus server values.

## Maven publishing

- Added the following configuration to the `pom.xml` file of the Maven project to enable publishing artifacts to the nexus snapshot repository.

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-deploy-plugin</artifactId>
    <version>3.1.4</version>
</plugin>
```

- Configured the `distributionManagement` section in `pom.xml` to point to the Nexus snapshot repository:

```xml
<distributionManagement>
    <snapshotRepository>
        <id>nexus-snapshots</id>
        <url>http://<nexus-ip>:<nexus-port>/repository/maven-snapshots</url>
    </snapshotRepository>
</distributionManagement>
```

- Configured the nexus credentials in the `~/.m2/settings.xml` file of Maven to allow authentication when publishing artifacts.

```xml
<settings>
    <servers>
        <server>
            <id>nexus-snapshots</id>
            <username>YOUR_NEXUS_USERNAME</username>
            <password>YOUR_NEXUS_PASSWORD</password>
        </server>
    </servers>
</settings>
```

Note: The `<id>` in `settings.xml` must match the `<id>` defined in the `distributionManagement` section. If the `settings.xml` file did not exist, it was created in the `~/.m2/` directory.

- Built and published the Maven artifact with:

```sh
mvn package
mvn deploy
```

- After deployment, the artifact was visible in the `maven-snapshots` repository in the Nexus UI.

## Troubleshooting

- **Problem 1: Nexus not accessible in the browser using the right IP + port**

Everything seems to be working fine, nexus is running without any issue but when you try to access it in the browser using the right IP + port, it doesn't work.

This might be due to the fact that the port on which nexus is running is not open in the firewall.

Make sure to open the port on which nexus is running in the firewall settings (In the inbound rules) from the DigitalOcean dashboard.
