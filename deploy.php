<?php
namespace Deployer;

require 'recipe/common.php';
require 'recipe/rsync.php';

// Global config
set('allow_anonymous_stats', false);

// Demo Host
host('mw@mw01-dev.tugraz.at')
    ->stage('demo')
    ->set('deploy_path', '/home/mw/demo/deploy/vpu-library-shelving')
    -> set('rsync',[
        'exclude'      => [
            '.git',
            'deploy.php',
        ],
        'exclude-file' => false,
        'include'      => [],
        'include-file' => false,
        'filter'       => [],
        'filter-file'  => false,
        'filter-perdir'=> false,
        'flags'        => 'rz',
        // TODO: install rsync on the server
        'options'      => ['delete', 'rsync-path=/home/mw/.local/bin/rsync'],
        'timeout'      => 60,
    ])
    -> set('rsync_src', __DIR__ . '/dist')
    -> set('rsync_dest','{{release_path}}');

// Demo build task
task('build-demo', function () {
    runLocally("npm run setup");
    runLocally("npm install");
    runLocally("npm run build-demo");
})->onStage('demo');

// Deploy task
task('deploy', [
    'deploy:info',
    'build-demo',
    'deploy:prepare',
    'deploy:lock',
    'deploy:release',
    'rsync',
    'deploy:shared',
    'deploy:symlink',
    'deploy:unlock',
    'cleanup',
    'success',
]);
after('deploy:failed', 'deploy:unlock');
