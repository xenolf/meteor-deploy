var jake = require('jake'),
    fs = require('fs'),
    path = require('path');


MeteorDeploy = (function() {

    function MeteorDeploy() {}

    MeteorDeploy.prototype.run = function() {
        var self = this;

        var program = require('commander')
                .version('0.1.2')
                .option('--env <environment>', 'Deploy to the provided environment.')
                .option('--mrt', 'Deploy using meteorite. Default false.', false);

        program.command('rollback')
            .description('Rolls back to the last deployed version.')
            .action(function() {
                self.checkOptions(program);
                self.runJakeTask('rollback');
            });

        program.command('deploy')
            .description('Deploys the git repository to a remote server.')
            .action(function () {
                self.checkOptions(program);
                self.runJakeTask('deployMeteor');
            });

        program.parse(process.argv);
    };

    MeteorDeploy.prototype.checkOptions = function(program) {
        if (!program.env) {
            console.log('No target environment provided!');
            program.help();
        }

        // parse package.json
        var file = fs.readFileSync('package.json');
        if (!file) {
            console.log('Could not read package.json!');
            program.help();
        }

        var pkg = JSON.parse(file);
        if (!pkg.deployConfig) {
            console.log('Could not find a deployConfig directive in your package.json');
            program.help();
        }

        if (!pkg.deployConfig[program.env]) {
            console.log('Could not find an object matching your target env in your deployConfig.');
            program.help();
        }

        program.deployConfig = {
            name: pkg.name,
            version: pkg.version || '?.?.?',
            remote: pkg.deployConfig[program.env].remote,
            port: pkg.deployConfig[program.env].port || '22',
            sshUser: pkg.deployConfig[program.env].user,
            cert: pkg.deployConfig[program.env].cert,
            passphrase: pkg.deployConfig[program.env].passphrase,
            remotePath: pkg.deployConfig[program.env].remotePath
        };

        global.program = program;
    };

    MeteorDeploy.prototype.runJakeTask = function(task) {
        jake.run.apply(jake, ['--jakefile', path.join(__dirname, '../', 'Jakefile'), '--jakelibdir', path.join(__dirname, '../', 'jakelib'), task]);
    };

    return MeteorDeploy;

})();

module.exports = MeteorDeploy;