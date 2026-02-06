const moment = require('moment');

module.exports = {
  // Add inside module.exports in helpers/hbs.js
  split: function(str, separator, index) {
      if (!str) return '';
      const parts = str.split(separator);
      return parts[index] || '';
  },
  formatDate: function (date, format) {
    if (!date) return '';
    return moment(date).format(format);
  },
  truncate: function (str, len) {
    if (str.length > len && str.length > 0) {
      let new_str = str + ' ';
      new_str = str.substr(0, len);
      new_str = str.substr(0, new_str.lastIndexOf(' '));
      new_str = new_str.length > 0 ? new_str : str.substr(0, len);
      return new_str + '...';
    }
    return str;
  },
  select: function (selected, options) {
    return options
      .fn(this)
      .replace(
        new RegExp(' value="' + selected + '"'),
        '$& selected="selected"'
      )
      .replace(
        new RegExp('>' + selected + '</option>'),
        ' selected="selected"$&'
      );
  },
  // --- Comparison Helpers ---
  ifeq: function(a, b) {
      return a == b;
  },
  // --- Data Access Helpers ---
  lookup: function(obj, key) {
      return obj ? obj[key] : null;
  },
  // --- String Helpers ---
  concat: function(...args) {
      // Remove the last argument which is the Handlebars options object
      return args.slice(0, -1).join('');
  },
  includes: function(str, searchStr) {
      if (!str) return false;
      return String(str).toLowerCase().includes(String(searchStr).toLowerCase());
  },
  replace: function(str, find, replaceWith) {
      if (!str) return '';
      // Replaces all occurrences
      return str.split(find).join(replaceWith);
  },
  // --- Logic/Utility Helpers ---
  array: function(...args) {
      // Remove the last argument which is the Handlebars options object
      return args.slice(0, -1);
  },
  or: function(...args) {
      // Remove the last argument which is the Handlebars options object
      const values = args.slice(0, -1);
      return values.some(v => !!v);
  },
  // --- JSON Helper (The Fix) ---
  json: function(context) {
      return JSON.stringify(context);
  }
};