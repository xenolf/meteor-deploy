meteor-deploy
=============

Deploy meteor applications to your own servers.
This package will deploy your meteor application in a way to be able to rollback to a previous deployment.
Basic filestructure is:
```
/<configured remote path>/<environment>/
  .payloads
    <projectName>-<deployment timestamp>
    ...
  <ProjectName> -> symlink to current deployment
  <ProjectName-previous> -> symlink to previous deployment
```

### Installation
```
npm install -g meteor-deploy
```

### Configuration
Imagine the following package.json:
```json
{
  "name": "MyCoolApp",
  "version": "0.1.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/xenolf/meteor-deploy.git"
  },
  "author": "azhwkd",
  "deployConfig": {
    "alpha": {
      "remote" : "192.0.0.100",
      "port": "22",
      "user": "myCoolSSHUser",
      "cert": "/path/to/my/private/key",
      "passphrase": "coolPass101",
      "remotePath": "/path/where/my/apps/should/run"
    }
  }
}
```
The deployConfig node is the root of all evil.
Under it there are so called environment nodes. For every environment you want to deploy to you can add a new object
and so every environment can have its own server and credentials.

### Usage
```bash
Usage: meteor-deploy [options] [command]

  Commands:

    rollback               Rolls back to the last deployed version.
    deploy                 Deploys the git repository to a remote server.

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    --env <environment>  Deploy to the provided environment.
    --mrt                Deploy using meteorite. Default false.
```
