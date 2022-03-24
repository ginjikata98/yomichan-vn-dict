const sqlite3 = require('sqlite3');
const Promise = require('bluebird');
const path = require('path');
const rootPath = path.resolve(__dirname, './finalDBSHanVietSound_Production.sqlite');
const db = new sqlite3.Database(rootPath, (err) => {
  if (err) {
    console.log('Could not connect to database', err);
    process.exit(1);
  } else {
    console.log('Connected to database');
  }
});


function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.log('Error running sql ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve({id: this.lastID});
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        console.log('Error running sql: ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.log('Error running sql: ' + sql);
        console.log(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  run, get, all
};
