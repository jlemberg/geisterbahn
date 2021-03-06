const debug = require("debug")("geisterbahn:loader");
const path = require("path");
const fs = require("fs");

const output = require("./output");
const config = require("./config");

const testDir = path.resolve(process.cwd(), config.geisterbahn.testsDirectory);

let requiredTests = [];

debug(`test path: ${testDir}`);

async function checkTestsDir() {
  debug("checking test path");
  return new Promise((resolve) => {
    fs.exists(testDir, (exists) => {
      if(!exists) {
        output.fatalError(`Could not read test directory ${testDir}`);
      }
      debug("test path OK");
      resolve();
    });
  })
}

async function loadAll() {
  await checkTestsDir();
  debug("loading all");
  const testNames = await scanDirForTests(testDir);
  debug(`found: "${testNames}"`);
  requireAll(testNames);
  return requiredTests;
}

async function load(arg) {
  await checkTestsDir();
  const testNames = arg.split(",");
  debug(`loading "${testNames}"`);
  requireAll(testNames);
  return requiredTests;
}

async function scanDirForTests(dir) {
  return new Promise(resolve => {
    fs.readdir(testDir, null, (err, files) => {
      resolve(files.map(file => file.replace(/\.js$/, "")));
    });
  });
}

function requireAll(testNames) {
  debug(`requiring all: "${testNames}"`);
  testNames
    .filter(testName => {
      if(testName.indexOf('_') === 0) return false;
      try {
        const stat = fs.lstatSync(path.resolve(testDir, `${testName}.js`));
        if(stat.isDirectory()) return false;
      } catch(_) {
        return false;
      }
      return true;
    })
    .forEach(testName => requireTest(testName));
}

function requireFromTestDir(testName) {
  const requirePath = path.resolve(testDir, testName);
  debug(`requiring ${testName} from ${requirePath}`);
  try {
    const cachedPath = `${requirePath}.js`;
    if(require.cache[cachedPath] !== undefined) {
      delete require.cache[cachedPath];
    }
    return require(requirePath);
  } catch(e) {
    output.fatalError(`Unable to load test ${requirePath}`, e);
  }
}

function requirePartials(partials, partialDefinitions) {
  for(const partial of partials) {
    const partialName = Array.isArray(partial) ? partial[0] : partial;
    const requiredPartial = requireFromTestDir(partialName);
    if(requiredPartial.partials) {
      requirePartials(requiredPartial.partials, partialDefinitions);
    }
    if(requiredPartial.definition) {
      if(Array.isArray(partial)) {
        requiredPartial.args = partial[1];
      }
      partialDefinitions.push(requiredPartial);
    }
  }
}

function requireTest(testName) {
  debug(`requireTest("${testName}")`);
  let requiredPackages = requireFromTestDir(testName);
  if(!Array.isArray(requiredPackages)) {
    requiredPackages = [requiredPackages];
  }

  for(var i=0,j=requiredPackages.length; i<j; i++) {
    const required = requiredPackages[i];
    required.name = `testName#${i}`;
    if(required.partials) {
      debug('requiring partials');
      required.partialDefinitions = [];
      requirePartials(required.partials, required.partialDefinitions);    
    }
    debug(`pushing ${testName} onto the test stack`);
    requiredTests.push(required);
  }
}

module.exports = { load, loadAll };
