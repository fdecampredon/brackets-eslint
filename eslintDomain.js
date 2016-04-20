
var fs = require('fs');
var path = require('path');
var eslint = require('eslint');

//constant

var defaultCli = new eslint.CLIEngine();
var DOMAIN_NAME = 'fdecampredon.brackets-eslint';

//state

var cli = defaultCli;
var ruleDir = null;
var projectRoot = null;
var eslintIgnore = null;
var hasCustomEslint = false;

//utils

function isDir(path) {
  try {
    return fs.statSync(path).isDirectory()
  } catch (e) {}
  return false;
}

function isFile(path) {
  try {
    return fs.statSync(path).isFile()
  } catch (e) {}
  return false;
}

function errorToString(e) {
  return e && e.message + e.stack ? (' at ' + e.stack) : '';
}

///config management

function setProjectRoot(path) {
  if (path !== projectRoot) {
    projectRoot = path;
    ruleDir = null;
    eslintIgnore = false;
    hasCustomEslint = false;
    cli = defaultCli;
  }
}

function updateConfigs() {
  var shouldUpdateCLI = false;
  var CLIEngine = eslint.CLIEngine;
  
  if (projectRoot) {
    if (!ruleDir) {
      var rulesDirPath = path.join(projectRoot, '.eslintrules');
      if (isDir(rulesDirPath)) {
        ruleDir = rulesDirPath;
        shouldUpdateCLI = true;
      }
    }
    
    if (!eslintIgnore) {
      var ignorePath = path.join(projectRoot, '.eslintignore');
      if (isFile(ignorePath)) {
        eslintIgnore = ignorePath;
        shouldUpdateCLI = true;
      }
    }
    
    if (!hasCustomEslint) {
      var eslintPath = path.join(projectRoot, 'node_modules', 'eslint');
      if (isDir(eslintPath)) {
        hasCustomEslint = true;
        var customCLIEngine;
        try {
          customCLIEngine = require(eslintPath).CLIEngine
        } catch (e) {}
        
        if (customCLIEngine) {
          CLIEngine = customCLIEngine;
          shouldUpdateCLI = true;
        }
      }
    }
  }
        
  if (shouldUpdateCLI) {
    var opts = {};
    if (eslintIgnore) {
      opts.ignore = true;
      opts.ignorePath = eslintIgnore;
    }
    if (ruleDir) {
      opts.rulePaths = [ruleDir];
    }
    cli = new CLIEngine(opts);
  }
}

//linting

function lintFile(fullPath, projectRoot, callback) {
  setProjectRoot(projectRoot);
  updateConfigs();

  fs.readFile(fullPath, {encoding: 'utf8'}, function (err, text) {
    if (err) {
      return callback(errorToString(err));
    }
    var res;
    try {
      res = cli.executeOnText(text, fullPath);
    } catch (e) {
      err = errorToString(e)
    }
    callback(err, res);
  });
} 


//registration

function init(domainManager) {

  if (!domainManager.hasDomain(DOMAIN_NAME)) {
    domainManager.registerDomain(DOMAIN_NAME, { major: 0,  minor: 1 });
  }
  domainManager.registerCommand(
    DOMAIN_NAME,
    'lintFile', // command name
    lintFile, // handler function
    true, // is async
    'lint given file with eslint', // description
    [{
      name: 'fullPath',
      type: 'string'
    }, {
      name: 'projectRoot',
      type: 'string'
    }]
  );
};

exports.init = init;
