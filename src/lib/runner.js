const debug = require("debug")("geisterbahn:runner");
const readlineSync = require("readline-sync");

const loader = require("./loader");
const output = require("./output");
const args = require("./args");

const results = [];
const breakpoints =
  (args.breakpoints + '').split(',')
  .map(unparsed => parseInt(unparsed));

const loopPoint = parseInt(args.loopPoint);

let currentTestNumber;
let loopPointTriggered = false;

function determineReturnCodeForResults(results) {
  debug("determining return code based on results");
  for(const testPackage of results) {
    for(const test of testPackage) {
      if(!test.passed) {
        return 1;
      }
    }
  }

  return 0;
}

function registerAllTestsForConfigurations(testConfigurations, page) {
  let tests = {};
  let testCount = 0;
  for(const testConfiguration of testConfigurations) {
    testConfiguration.definition(page, (testTitle, testDefinition) => {
      testCount++;
      const packageTitle = testConfiguration.title;
      if(!tests[packageTitle]) tests[packageTitle] = {};
      tests[packageTitle][testTitle] = testDefinition;
    });
  }
  return [tests, testCount];
}

async function executeTestPackage(title, tests) {
  output.runningDefinition(title);
  let results = [];
  for(const test in tests) {
    output.runningTest(test, currentTestNumber);
    let passed = false;
    let exc;
    try {
      await tests[test]();
      passed = true;
    } catch (e) {
      passed = false;
      exc = e;
    }
    output.testResult(passed, currentTestNumber);
    results.push({packageTitle:title, title:test, testNumber:currentTestNumber, passed, exception:exc});
    if(breakpoints.indexOf(currentTestNumber) !== -1) {
      readlineSync.question('Breakpoint set, press <ENTER> to continue ');
    }
    if(currentTestNumber === loopPoint) {
      loopPointTriggered = true;
      break;
    }
    currentTestNumber++;
  }
  return results;
}

async function executeTestPackages(testPackages, testCount) {
  output.testCount(Object.keys(testPackages).length, testCount);
  currentTestNumber = 1;
  let resultSets = [];
  for(const testPackage in testPackages) {
    resultSets.push( await executeTestPackage(testPackage, testPackages[testPackage]) );
    if(loopPointTriggered) {
      break;
    }
  }
  output.summary(resultSets);
  return resultSets;
}

async function run(testConfigurations, page) {
  debug(`running ${testConfigurations.length} test packages`);
  const configurationCount = testConfigurations.length;
  const [testPackages, testCount] = registerAllTestsForConfigurations(testConfigurations, page);
  debug(`registered ${testCount} tests`);

  let resultSets;

  do {
    loopPointTriggered = false;
    resultSets = await executeTestPackages(testPackages, testCount);
    if(loopPointTriggered) {
      readlineSync.question('Loop point set, press <ENTER> to restart ');
    }
  } while(loopPointTriggered);

  return determineReturnCodeForResults(resultSets);
}

module.exports = {run};
