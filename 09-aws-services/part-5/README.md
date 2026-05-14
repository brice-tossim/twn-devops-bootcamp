# Interacting with AWS CLI

- Install guide: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- Once installed, configure using `aws configure` command.
- If a user already has access keys, you can use those to configure the CLI. Otherwise, you can create a new user in the AWS Management Console and generate access keys for that user or use an existing user with appropriate permissions.

## Create EC2 instance

- Key pair:

```
aws ec2 create-key-pair \
    --key-name my-key-pair \
    --query 'KeyMaterial' \
    --output text > my-key-pair.pem

chmod 400 my-key-pair.pem
```

- Create a VPC (optional, you can use the default VPC):

```
aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=MyVPC}]'

aws ec2 modify-vpc-attribute \
    --vpc-id <your-vpc-id> \
    --enable-dns-support

aws ec2 modify-vpc-attribute \
    --vpc-id <your-vpc-id> \
    --enable-dns-hostnames   
```

- Create an Internet Gateway and attach it to the VPC:

```
aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=MyInternetGateway}]'

aws ec2 attach-internet-gateway \
    --internet-gateway-id <your-igw-id> \
    --vpc-id <your-vpc-id>
```

- Create a route table:

```
aws ec2 create-route-table \
    --vpc-id <your-vpc-id> \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=MyPublicRouteTable}]'
```

- Create a route to the Internet Gateway:

```
aws ec2 create-route \
    --route-table-id <your-route-table-id> \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id <your-igw-id>
```

- Create a subnet (optional, you can use the default subnet):

```
aws ec2 create-subnet \
    --vpc-id <your-vpc-id> \
    --cidr-block 10.0.1.0/24
```

- Associate the subnet with the route table:

```
aws ec2 associate-route-table \
    --route-table-id <your-route-table-id> \
    --subnet-id <your-subnet-id>
```

- Security group:

```
aws ec2 create-security-group \
    --group-name sgrp-ec2-instance \
    --description "Security group for my new ec2 instance" \
    --vpc-id <your-vpc-id>

aws ec2 authorize-security-group-ingress \
    --group-id <your-security-group-id> \
    --protocol tcp \
    --port 22 \
    --cidr <your-ip-address>/32
```


- Create an EC2 instance:

```
aws ec2 run-instances \
    --image-id ami-02166c47d457c16a3 \
    --count 1 \
    --instance-type t2.micro \
    --key-name my-key-pair \
    --security-group-ids <your-security-group-id> \
    --subnet-id <your-subnet-id> \
    --associate-public-ip-address \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=my-ec2-instance}]'
```

