# Create server and deploy application on DigitalOcean

## Overview

In this project, I provisioned and configured a Linux cloud server (Droplet) on DigitalOcean to host a Java web application.

The main goal was to practice basic cloud server administration while applying security best practices such as avoiding direct day-to-day use of the `root` account and following the principle of least privilege.

To do that, I created:

- An admin user named `uadmin` with `sudo` privileges
- A standard user named `appuser` dedicated to owning and running the application

Finally, I built the application locally, uploaded the generated JAR file to the server, and ran it there with Java.

## Technologies used

- **Cloud Provider:** DigitalOcean
- **Operating System:** Ubuntu 24.04 LTS x64
- **Runtime:** Java 17
- **Build Tool:** Gradle
- **Access Method:** SSH with key-based authentication

## Infrastructure details

- **Droplet Type:** Basic Droplet
- **Memory:** 512 MB RAM
- **vCPU:** 1
- **Storage:** 10 GB SSD
- **Region:** New York (NYC3)

## Server setup

Connect to the server using SSH. For security best practices, configure the firewall so that SSH is only allowed from your own IP address

```sh
ssh root@<droplet_ip_address>
```

## Create users

Create the admin and the app user

```sh
# Create uadmin and appuser
adduser uadmin
adduser appuser

# Grant sudo privileges to uadmin
usermod -aG sudo uadmin
```

- `uadmin` will be used for administration and package installation.
- `appuser` will only be used to own and run the application.

## Configure SSH access for uadmin

Create the SSH directory and the `authorized_keys` file for `uadmin`.

```sh
mkdir -p /home/uadmin/.ssh # If the folder doesn't exist
vi /home/uadmin/.ssh/authorized_keys
```

Copy the content of your public key (generally located in `~/.ssh/id_rsa.pub` on your local machine) and paste it into the `authorized_keys` file.

Set the correct permissions and the ownership for the `.ssh` directory and the `authorized_keys` file:

```sh
chmod 700 /home/uadmin/.ssh # Only owner can read, write and execute
chmod 600 /home/uadmin/.ssh/authorized_keys # Only owner can read and write
chown -R uadmin:uadmin /home/uadmin/.ssh # Change the ownership to uadmin user
```

At this point, `uadmin` can connect to the server using SSH keys then perform the other steps.

But before closing the `root` session, open a new terminal tab and test the SSH connection with `uadmin` user:

```sh
ssh uadmin@<droplet_ip_address>
```

## Install necessary dependencies

Install `openjdk-17-jre-headless` which is needed to execute the Java application.

```sh
sudo apt update
sudo apt install -y openjdk-17-jre-headless
```

## Create a directory for the application

We'll create an `app` directory within `/opt` to upload the artifact (or wherever you want to upload it).

```sh
sudo mkdir -p /opt/app
```

## Build and upload the application

On your local machine, build the project. The generated JAR file will be located in the `build/libs` directory.

Then, upload the JAR file to the server using `scp` command.

Note: The `app` folder by default is owned by `root` user, so you might encounter a permission issue when trying to upload the file. To avoid that, we'll upload the file in the `/tmp` directory first, then move it to the `app` directory.

```sh
gradle build # Or ./gradlew build if you're using the wrapper
scp build/libs/<artifact-name>.jar uadmin@<droplet_ip_address>:/tmp/app.jar
```

Note: I renamed the artifact to `app.jar` for simplicity, but you can keep the original name if you want.

## Move the artifact and change the ownership

Now that the artifact is uploaded, we can move it to the `app` directory and change the ownership to `appuser` so that it can run the application without any permission issue.

```sh
sudo mv /tmp/app.jar /opt/app/app.jar
sudo chown -R appuser:appuser /opt/app
```

## Run the application as a background process using `appuser`

Since we don't have SSH access with `appuser`, we'll run the application from the `uadmin` session.

We'll use a command that starts the application as a background process and log the output to a file, so that it can keep running even if we close the SSH session and we can check the logs later if needed.

```sh
sudo -u appuser bash -c "nohup java -jar /opt/app/app.jar > /opt/app/app.log 2>&1 &"
```

Note: You can also switch to `appuser` using `su - appuser` command and then run the application.

## Check the application is running and identify the port on which it's running

For doing so, we can check the logs to see if the application started successfully and on which port it's running.

We can also check the running processes to find the port on which the application is running.

```sh
tail -f /opt/app/app.log
```

or

```sh
sudo ss -lntp | grep java
```

## Troubleshooting

- **Problem 1: Permission denied when trying to connect with "uadmin" user using SSH**

```text
ssh uadmin@<droplet_ip_address>
uadmin@<droplet_ip_address>: Permission denied (publickey).
```

If you encounter this issue, it might be due to the fact that you haven't set the right public key in the `authorized_keys` file of the `uadmin` user, or you haven't set the right permissions for the `.ssh` directory and the `authorized_keys` file.

Make sure to set them correctly as mentioned in the steps above.

- **Problem 2: Application not accessible in the browser using the right IP + port**

Everything seems to be working fine, the application is running without any issue but when you try to access it in the browser using the right IP + port, it doesn't work.

This might be due to the fact that the port on which the application is running is not open in the firewall.

Make sure to open the port on which the application is running in the firewall settings (In the inbound rules) from the DigitalOcean dashboard.
