var shell = require('shelljs');

shell.rm('-rf', 'build');
shell.exec('git clone https://github.com/NicholasBoll/nicholasboll.github.io.git build');
shell.rm('-rf', ['build/articles', 'build/tag', 'build/css'])
shell.exec('wintersmith build');
shell.exec('cd build; git add -A');
shell.exec('cd build; git commit -m "Auto-deploy"');
shell.exec('cd build; git push origin master');
