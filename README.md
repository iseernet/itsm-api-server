# ITSM API SERVER

# Jira

start:

```sh
JIRA_DB_USER=user JIRA_DB_PASSWORD='pw' docker compose --file docker-compose-prod.yml up -d
```

# Branches
## main
    main develop branch
## qa
    test environment branch
## production
    production environment branch
## other branches
    develop branch for developing new features or fixing bugs
## How to use branch when developing new feature or fix bugs
    1. create a new branch based on 'main' branch
    2. develop on the new branch
    3. merge the new branch to 'main' branch
    4. merge 'main' branch to 'qa' branch and test on test environment
    5. merge 'main' branch to 'production' branch and release to production environment

# Source code structure
```
├── dist //destination directory for building
├── doc //documents
├── k8s //deploy scripts for deployment
│    └── envs
│    ├── prod
│    └── test
├── node_modules //node modules, installed by 'npm install'
├── scripts //scripts
├── src //source code
│    ├── app //app entry and cron entry
│    ├── config //app configrations
│    ├── controllers //middle layer between routes and services
│    ├── cron //cron jobs
│    ├── db //database pool
│    ├── enums
│    ├── errors
│    ├── middleware // signature verification
│    ├── routes //routes entry for express
│    ├── services //business services
│    ├── types //data structures
│    └── utils 
│          ├── db //databse initializing
│          ├── excel //excel export
│          ├── feishu //feishu messaging
│          ├── itsmpower //idc auto reboot
│          ├── jira //jira client
│          ├── pbdalert //alert system interface
│          └── rn //rn client and signature
├── test //test scripts
└── uploads //upload files
```

# Add new npm package
    Run npm script to add new npm package to project like:
    npm install axion --save
    The "--save" flag will save the package definition to the "package.json" file

# Build and deploy
## scripts
    Building scripts are defined in the "scripts" section of the "package.json" file. 
    Using npm to run scripts like:
    npm run dev //run project on local
    npm run build-production //build package for production environment
    npm run test:issue //run issue test script
    etc...

## deploy on production environment
