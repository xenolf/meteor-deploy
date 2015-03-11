module.exports = function(config) {

    var spawn = require('child_process').spawn,
        fs = require('fs'),
        Connection = require('ssh2'),
        sshConn = new Connection(),
        sshReady = false;

    require('./colors');

    sshConn.on('connect', function() {
        exports.notice('SSHConnection :: Connect');
    });

    sshConn.on('ready', function() {
        exports.notice('SSHConnection :: Ready');
        sshReady = true;
    });

    sshConn.on('error', function(err) {
        exports.error('SSHConnection :: Error :: ' + err);
    });

    sshConn.on('end', function() {
        exports.notice('SSHConnection :: End');
    });

    sshConn.on('close', function() {
        exports.notice('SSHConnection :: Close');
    });

    var options = {
        host: config.deployConfig.remote,
        port: config.deployConfig.port,
        username: config.deployConfig.sshUser,
        privateKey: fs.readFileSync(config.deployConfig.cert),
        agent: process.env.SSH_AUTH_SOCK/*,
        debug: function (data) {
            console.log(data);
        }*/
    };
    if (config.deployConfig.passphrase) {
        options.passphrase = config.deployConfig.passphrase;
    }

    exports.error = function (message) {
        console.log('\n  ✘ '.red + ' ' + message + '\n');
    };

    exports.success = function (message) {
        console.log('\n  ✔ '.green + ' ' + message + '\n');
    };

    exports.notice = function (message) {
        console.log('\n  ● '.yellow + ' ' + message + '\n');
    };

    exports.printItem = function (prefix, item) {
        console.log(prefix);
        Object.keys(item).forEach(function (key) {
            console.log('|-- ' + key + ': ' + item[key]);
        });
    };

    exports.remote = function (cmd, callback) {

        if (!sshReady) {
            sshConn.connect(options);
            sshConn.on('ready', function() {
                exports.remote(cmd, callback);

            });
            return;
        }

        var out = "";

        sshConn.exec(cmd, function (err, stream){

            if (err) callback(-1, null);

            stream.on('data', function(data, extended) {
                out += data;

                if (!extended) {
                    process.stdout.write(('' + data).replace(/\n/g, '\n    ').grey);
                } else {
                    process.stdout.write(('' + data).replace(/\n/g, '\n    ').red);
                }
            });

            stream.on('exit', function(code, signal) {
                callback(code, out);
            });

        });

    };

    exports.remoteSFTP = function (localFile, remoteFile, callback) {

        sshConn.sftp(function (err, sftp) {

            if (err) callback(-1);

            sftp.on('end', function() {

                callback(0);

            });

            var writeStream = sftp.createWriteStream(remoteFile);

            if (!writeStream) callback(-1);

            var readStream = fs.createReadStream(localFile);

            readStream.on('end', function() {
                callback(0);
            });

            readStream.pipe(writeStream);

        });

    };

    exports.closeRemote = function () {
        sshConn.end();
    };


    exports.local = function (cmd, callback) {

        cmd = cmd.match(/[^"]+(?=(" )|"$)|[^"\s]+/g);
        var pname = cmd.shift();
        var proc = spawn(pname, cmd),
            out = "";

        console.log(('\n  $ ' + pname + ' ' + cmd.join(' ')).blue);
        process.stdout.write('\n    ');

        proc.stdout.on('data', function (data) {
            out += data;
            process.stdout.write(('' + data).replace(/\n/g, '\n    ').grey);
        });

        proc.stderr.on('data', function (data) {
            process.stdout.write(('' + data).replace(/\n/g, '\n    ').red);
        });

        proc.on('close', function (code) {
            callback(code, out);
        });

        proc.stdin.end();
    };

    return exports;
};
