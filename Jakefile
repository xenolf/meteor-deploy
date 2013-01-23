

desc('Deploy a given env to the target host.');
task('deployMeteor',['deploy:symlink', 'deploy:restart', 'deploy:cleanUp'], function() {
    console.log('Everything done!');
});

desc('Rollback to the previous deployed version');
task('rollback', ['deploy:unarchive', 'deploy:cleanUp'], function() {
    console.log('Rollback complete!');
});