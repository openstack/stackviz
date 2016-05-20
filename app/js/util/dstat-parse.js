'use strict';

var timeFormat = require('d3-time-format');
var dsv = require('d3-dsv');

var fillArrayRight = function(array) {

  // "fill" the array to the right, overwriting empty values with the next
  // non-empty value to the left
  // only false values will be overwritten (e.g. "", null, etc)
  for (var i = 0; i < array.length - 1; i++) {
    if (!array[i + 1]) {
      array[i + 1] = array[i];
    }
  }
};

var mergeNames = function(primary, secondary) {

  // "zip" together strings in the same position in each array, and do some
  // basic cleanup of results
  var ret = [];
  for (var i = 0; i < primary.length; i++) {
    ret.push((primary[i] + '_' + secondary[i]).replace(/[ /]/g, '_'));
  }
  return ret;
};

var parseDstat = function(data, year) {

  var primaryNames = null;
  var secondaryNames = null;
  var names = null;

  var minimums = {};
  var maximums = {};

  // assume UTC - may not necessarily be the case?
  // dstat doesn't include the year in its logs, so we'll need to copy it
  // from the subunit logs
  var dateFormat = timeFormat.utcParse('%d-%m %H:%M:%S');

  var parsed = dsv.csvParseRows(data, function(row, i) {
    if (i === 0) {
      if (row.length !== 1 ||
          !row[0].startsWith('Dstat') ||
          !row[0].endsWith('CSV output')) {
        throw new Error('Invalid Dstat CSV');
      }
    } else if (i <= 4) { // header rows - ignore
      return null;
    } else if (i === 5) { // primary
      primaryNames = row;
      fillArrayRight(primaryNames);
      return null;
    } else if (i === 6) { // secondary
      secondaryNames = row;

      names = mergeNames(primaryNames, secondaryNames);
      return null;
    } else {
      var ret = {};

      for (var col = 0; col < row.length; col++) {
        var name = names[col];
        var value = row[col];
        if (value && name) {
          if (name === 'system_time') {
            value = dateFormat(value);
            value.setFullYear(1900 + year);
          } else {
            value = parseFloat(value);
          }

          if (!(name in minimums) || value < minimums[name]) {
            minimums[name] = value;
          }

          if (!(name in maximums) || value > maximums[name]) {
            maximums[name] = value;
          }

          ret[name] = value;
        }
      }

      return ret;
    }
  });

  return {
    minimums: minimums,
    maximums: maximums,
    entries: parsed
  };
};

module.exports = parseDstat;
