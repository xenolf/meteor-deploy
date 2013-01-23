var action = require('../lib/actions')(global.program);

namespace('deploy', function() {

    desc('Symlink new deployment');
    task('symlink', ['deploy:linklast'], function () {

        action.remote('ln -sv ' + global.program.deployConfig.payload
            + ' ' + global.program.deployConfig.linkpath + global.program.deployConfig.name, function (exitcode) {
            if (exitcode === 0) {
                action.success('New deployment linked');
                complete();
            } else {
                action.error('Failed to link new deployment');
                fail();
            }

        });
    }, true);

    desc('Create archive link to last deployment');
    task('linklast', ['deploy:rmarchive'], function () {
        action.remote('readlink ' + global.program.deployConfig.linkpath
            + global.program.deployConfig.name, function (exitcode, stdout) {
            if (stdout) {
                action.remote('mv -v ' + global.program.deployConfig.linkpath + global.program.deployConfig.name + ' '
                    + global.program.deployConfig.linkpath + global.program.deployConfig.name + '-previous', function (errcode) {
                    if (exitcode === 0) {
                        action.success('Previous deployment archived');
                        complete();
                    } else {
                        action.error('Failed to archive previous deployment');
                        fail();
                    }
                });
            } else {
                action.notice('No previous deployment found');
                complete();
            }
        });
    }, true);

    desc('Unarchives the last archived deployment and makes it active.');
    task('unarchive', ['deploy:rmcurrent'], function() {

        action.remote('readlink ' + global.program.deployConfig.linkpath +
            global.program.deployConfig.name + '-previous', function (exitcode, stdout) {

            if (stdout) {

                action.remote('mv -v ' + global.program.deployConfig.linkpath + global.program.deployConfig.name + '-previous' + ' ' +
                    global.program.deployConfig.linkpath + global.program.deployConfig.name, function (errcode) {

                    if (exitcode === 0) {
                        action.success('Unarchived previous deployment.');
                        complete();
                    } else {
                        action.error('Failed to unarchive previous deployment');
                        fail();
                    }

                });

            } else {
                action.notice('No archived deployment found');
                complete();
            }

        });

    },true);

    desc('Removes the current deployment.');
    task('rmcurrent', function() {

        var env = global.program.env + '/';
        global.program.deployConfig.linkpath = global.program.deployConfig.remotePath + env;

        action.remote('readlink ' + global.program.deployConfig.linkpath
            + global.program.deployConfig.name, function (exitcode, stdout) {

            if (stdout) {

                action.remote('rm -rf ' + stdout.substr(0, stdout.length - 1) +
                    ' && rm ' + global.program.deployConfig.linkpath + global.program.deployConfig.name, function (exitcode) {

                    if (exitcode === 0) {
                        action.success('Disposed of active deployment');
                        complete();
                    } else {
                        action.error('Unable to dispose of active deployment');
                        fail();
                    }

                });

            } else {
                action.notice('No active deployment found');
                complete();
            }

        });

    }, true);

    desc('Remove archived deployment');
    task('rmarchive', ['meteor:installdeps'], function () {

        var env = global.program.env + '/';
        global.program.deployConfig.linkpath = global.program.deployConfig.remotePath + env;

        action.remote('readlink ' + global.program.deployConfig.linkpath
            + global.program.deployConfig.name + '-previous', function (exitcode, stdout) {
            if (stdout) {
                action.remote('rm -rf ' + stdout.substr(0, stdout.length - 1) +
                    ' && rm ' + global.program.deployConfig.linkpath + global.program.deployConfig.name + '-previous', function (exitcode) {
                    if (exitcode === 0) {
                        action.success('Disposed of archived deployment');
                        complete();
                    } else {
                        action.error('Unable to dispose of archived deployment');
                        fail();
                    }
                });
            } else {
                action.notice('No archived deployment found');
                complete();
            }

        });

    }, true);

    desc('Put contents of repository to remote server');
    task('putremote', ['deploy:clone', 'deploy:checkoutRef', 'meteor:bundle', 'deploy:createPayloadDir'], function () {

        action.notice('Starting SFTP upload...');

        action.remoteSFTP(global.program.deployConfig.tempdir + global.program.env + '.tar.gz',
            global.program.deployConfig.payload + '/' + global.program.env + '.tar.gz', function (exitcode) {

            if (exitcode === 0) {
                action.success('Meteor bundle contents put to remote');
                complete();
            } else {
                action.error('Could not put meteor bundle to remote. Make sure `.payloads` directory exists');
                fail();
            }
        });
    }, true);

    desc('Checks out a git ref or the latest ref if none is specified.');
    task('checkoutRef', ['deploy:switchToTmp'], function () {

        // determine latest ref
        action.local("git for-each-ref  --sort=-authordate "
                    + "--format='%(refname)' --count=1", function (exitcode, stdout) {

            if (stdout || global.program.deployConfig.ref) {

                stdout = stdout.replace(/'/g, '').split('/').splice(2,2).join('/').trim();

                var ref = global.program.deployConfig.ref ? global.program.deployConfig.ref : stdout;

                action.local("git reset --hard " + ref, function (exitcode, stdout) {

                    if (exitcode === 0) {
                        action.success('Reset HEAD to ' + ref);
                        complete();
                    }
                    else {
                        action.error('Failed to reset HEAD to ' + ref);
                        fail();
                    }

                });
            } else {

                action.error('Could not determine latest ref.');
                fail();

            }
        });

    }, true);

    desc('Creates the remote payload directory for the upload');
    task('createPayloadDir', [], function () {
        var env = global.program.env + '/';
        global.program.deployConfig.payload = global.program.deployConfig.remotePath + env + '.payloads/'
            + global.program.deployConfig.name + '-' + new Date().getTime();

        action.remote('mkdir -p ' + global.program.deployConfig.payload, function(exitcode) {
            if (exitcode === 0) {
                action.success('Created payload folder ' + global.program.deployConfig.payload);
                complete();
            } else {
                action.error('Failed to create payload folder ' + global.program.deployConfig.payload);
                fail();
            }
        });
    }, true);

    desc('Switches to the temp directory');
    task('switchToTmp', [], function () {

        action.notice('Leaving ' + process.cwd());
        try {
            process.chdir(global.program.deployConfig.tempdir);
            action.success('Entered ' + process.cwd());
            complete();
        } catch (err) {
            action.error('Could not change execution dir to ' + global.program.deployConfig.tempdir);
            fail();
        }

    }, true);

    desc('Clone a copy of the repository to a temporary directory');
    task('clone', ['deploy:createtempdir', 'deploy:getGitRemote'], function () {
        action.local('git clone ' + global.program.deployConfig.gitRemote + ' ' +
            global.program.deployConfig.tempdir, function (exitcode) {

            if (exitcode === 0) {
                action.success('Repo cloned into a temporary directory');
                complete();
            } else {
                action.error('Could not clone the repository from the remote ' + global.program.deployConfig.gitRemote);
                fail();
            }

        });
    }, true);

    desc('Get the remote git repository uri from the repository.');
    task('getGitRemote', function() {

        action.local('git remote -v', function (exitcode, stdout) {

            if (stdout)
            {
                if (stdout.indexOf('fatal') === -1)
                {
                    var remotes = stdout.split('\n');

                    if (!global.program.deployConfig.ref)
                    {
                        // select the first remote when no ref is specified.
                        global.program.deployConfig.gitRemote = remotes[0].replace(/\s\(([^\)]+)\)/g, '').split('\t')[1];
                    }
                    else
                    {
                        // if a ref is specified, search for a matching remote.
                        var ref = global.program.deployConfig.ref.split('/')[0];
                        for (var value in remotes)
                        {
                            var keyValue = value.replace(/\s\(([^\)]+)\)/g, '').split('\t');
                            if (keyValue[0] === ref)
                            {
                                global.program.deployConfig.gitRemote = keyValue[1];
                            }
                        }
                    }

                    if (global.program.deployConfig.gitRemote && global.program.deployConfig.gitRemote.indexOf('https') === -1)
                    {
                        action.success("Found git remote " + global.program.deployConfig.gitRemote);
                        complete();
                    }
                    else
                    {
                        action.error("Failed to determine git remote. (Only SSH git remotes are supported)");
                        fail();
                    }
                }
                else
                {
                    action.error("Local directory is no git repository.");
                    fail();
                }
            }
            else
            {
                action.error("Couldn't determine git remote.");
                fail();
            }

        });

    }, true);

    desc('Creates a temporary directory');
    task('createtempdir', ['deploy:removeoldtempdir'], function () {
        action.local('mkdir ' + global.program.deployConfig.tempdir, function (exitcode) {
            if (exitcode === 0) {
                action.success('New temporary directory created');
                complete();
            } else {
                action.error('Could not create temporary directory');
                fail();
            }
        });
    }, true);

    desc('Removes old temporary directories');
    task('removeoldtempdir', [], function () {
        global.program.deployConfig.tempdir = '/tmp/' + global.program.deployConfig.name + '-launch/';
        action.local('rm -rf ' + global.program.deployConfig.tempdir, function (exitcode) {
            if (exitcode === 0) {
                action.success('Old temporary directory removed');
                complete();
            } else {
                action.error('Could not remove old temporary directory');
                fail();
            }
        });
    }, true);

    desc('Cleans up SSH and temp folders');
    task('cleanUp', function () {
        action.closeRemote();
    });

});

namespace('meteor', function() {

    desc('Install dependencies via npm');
    task('installdeps', ['deploy:putremote', 'meteor:moveBundleFolder', 'meteor:deleteBundleFolder', 'meteor:deleteBundleFile'], function () {

        action.remote('cd ' + global.program.deployConfig.payload +
            '/server && npm install fibers@0.6.9 --production', function (exitcode) {
            if (exitcode === 0) {
                action.success('Dependencies installed');
                complete();
            } else {
                action.error('Failed to install dependencies');
                fail();
            }

        });
    }, true);

    desc('deletes the <env>.tar.gz file.');
    task('deleteBundleFile', function() {

        action.remote('rm -rf ' + global.program.env + '.tar.gz', function (exitcode) {
            if (exitcode === 0) {
                action.success('Removed bundle file.');
                complete();
            } else {
                action.error('Failed to delete bundle file.');
                fail();
            }
        });

    }, true);

    desc('deletes the bundle/ folder.');
    task('deleteBundleFolder', function() {

        action.remote('rm -rf bundle/', function (exitcode) {
            if (exitcode === 0) {
                action.success('Deleted bundle folder.');
                complete();
            } else {
                action.error('Failed to delete bundle folder');
                fail();
            }
        });

    }, true);

    desc('Moves the meteor bundle from the bundle dir one up');
    task('moveBundleFolder', ['meteor:extractBundle'], function() {

        action.remote('cd ' + global.program.deployConfig.payload + ' && mv bundle/* ./', function(exitcode) {
            if (exitcode === 0) {
                action.success('Moved meteor bundle to payload root.');
                complete();
            } else {
                action.error('Failed to move meteor bundle.');
                fail();
            }
        })

    }, true);

    desc('Extracts the application bundle on the server');
    task('extractBundle', [], function() {
        action.remote('cd ' + global.program.deployConfig.payload + ' && tar -xmf ' + global.program.env + '.tar.gz', function(exitcode) {
            if(exitcode === 0) {
                action.success('Extracted meteor bundle.');
                complete();
            } else {
                action.error('Failed to extract meteor bundle.');
                fail();
            }
        })
    }, true);

    desc('Bundle meteor to a deployment tar.gz');
    task('bundle', function () {

        var bundler = global.program.mrt ? 'mrt' : 'meteor';

        action.local('which ' + bundler, function(exitcode, data) {

            if (exitcode === 0) {

                bundler = data;
                action.local(bundler + ' bundle ' + global.program.env + '.tar.gz', function(exitcode) {
                    if (exitcode === 0) {
                        action.success("Meteor application bundle created.");
                        complete();
                    } else {
                        action.error('Could not bundle the meteor deployment package.');
                        fail();
                    }
                });

            } else {
                action.error('Coult not determine location of ' + bundler);
                fail();
            }

        });

    }, true);

});