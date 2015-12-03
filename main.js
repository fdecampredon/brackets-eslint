/*global define, brackets */

define(function (require, exports, module) {
  'use strict';

  var CodeInspection = brackets.getModule('language/CodeInspection');
  var LanguageManager = brackets.getModule('language/LanguageManager');
  var NodeDomain = brackets.getModule('utils/NodeDomain');
  var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
  var ProjectManager = brackets.getModule('project/ProjectManager');
  

  var eslintDomain = new NodeDomain('fdecampredon.brackets-eslint', ExtensionUtils.getModulePath(module, './eslintDomain'));
  
  function formatMessage(result) {
    var message = result.message;
    if (result.ruleId) {
      message += ' [' + result.ruleId + ']';
    }
    var bracketsError = {
      message: message,
      pos: {
        line: result.line - 1,
        ch: result.column - 1
      },
      type: result.severity === 2 ? CodeInspection.Type.ERROR :  CodeInspection.Type.WARNING
    }
    if (result.source) {
      bracketsError.endPos = {
        line: result.line - 1,
        ch: result.column - 1 + result.source.trim().length
      }
    }
    return bracketsError;
  }
  
  function lint(text, fullPath) {
    var projectRoot = ProjectManager.getProjectRoot().fullPath;

    return eslintDomain.exec('lintFile', fullPath, projectRoot)
      .then(function (report) {
        if (report.results.length > 1) {
          console.warn('ESLint returned multiple results, where only one set was expected');
        }
        return {
          errors: (
            report.results
            .reduce(function (messages, result) {
              if (result.messages) {
                messages.push.apply(messages, result.messages);
              }
              return messages;
            }, [])
            .map(formatMessage)
          )
        }
      });
  }
  
  CodeInspection.register(LanguageManager.getLanguageForExtension('js').getId(), {
    name: 'ESLint',
    scanFileAsync: lint
  });
});