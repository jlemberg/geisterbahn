const args = require("args");

args
  .option("tests", "List of test packages to run (comma separated)")
  .option("device", "Device to emulate")
  .option("devtools", "Auto-enable DevTools panel - also enables 'show'")
  .option("show", "Show the browser", false)
  .option("test-source", "Path from which test packages are to be loaded (overrides geisterbahnfile.js)")
  .option("environment", "Environment to use")
  .option("geisterbahnfile", "Directory containing geisterbahnfile.js", ".")
  .option("breakpoints", "Halt execution after running the test with the specified number(s) (comma separated)")
  .option("loop-point", "Repeat execution after running the test with the specified number");

module.exports = args.parse(process.argv);
