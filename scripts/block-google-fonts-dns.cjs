const dns = require("node:dns");
const blocked = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const lookup = dns.lookup;
dns.lookup = function blockedLookup(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (blocked.has(String(hostname))) {
    const error = new Error(`getaddrinfo ENOTFOUND ${hostname}`);
    error.code = "ENOTFOUND";
    error.errno = -3008;
    error.syscall = "getaddrinfo";
    error.hostname = hostname;
    if (typeof callback === "function") {
      callback(error);
      return;
    }
    throw error;
  }
  return lookup.call(this, hostname, options, callback);
};