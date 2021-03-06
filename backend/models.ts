/* eslint-disable no-console */
const { Pool } = require('pg');
const {
  getPrimaryKeys,
  getForeignKeys,
} = require('./DummyD/primaryAndForeignKeyQueries');

/**
 ********************************************************* INITIALIZE TO DEFAULT DB *************************************************
 */

// URI Format: postgres://username:password@hostname:port/databasename
// Note: User must have a 'postgres' role set-up prior to initializing this connection. https://www.postgresql.org/docs/13/database-roles.html

let PG_URI: string = 'postgres://postgres:postgres@localhost:5432';
let pool: any = new Pool({ connectionString: PG_URI });

/**
 *  ********************************************************* HELPER FUNCTIONS *************************************************
 */

// helper function that creates the column objects, which are saved to the schemaLayout object
// this function returns a promise to be resolved with Promise.all syntax
const getColumnObjects = (tableName: string) => {
  console.log('Running getColumnObjects using the following tableName', tableName)
  const queryString = `SELECT column_name, data_type, character_maximum_length
     FROM information_schema.columns
     WHERE table_name = $1;
    `;
  const value = [tableName];
  return new Promise((resolve) => {
    pool.query(queryString, value).then((result) => {
      const columnInfoArray: any = [];
      for (let i = 0; i < result.rows.length; i += 1) {
        const columnObj: any = {
          columnName: result.rows[i].column_name,
          dataInfo: {
            data_type: result.rows[i].data_type,
            character_maxiumum_length: result.rows[i].character_maxiumum_length,
          },
        };
        columnInfoArray.push(columnObj);
      }
      resolve(columnInfoArray);
    });
  });
};

// gets all the database names of the current postgres instances
// ignoring the postgres, template0 and template1 dbs
const getDBNames = () =>

// let dbSize: string;
// if (dbName) {
//   db.query(`SELECT pg_size_pretty(pg_database_size('${dbName}'));`).then(
//     (queryStats) => {
//       dbSize = queryStats.rows[0].pg_size_pretty;
//     }
//   );
// };
// db.getLists().then((data) => event.sender.send('db-lists', data, dbSize));

  new Promise((resolve) => {
    pool.query('SELECT datname FROM pg_database;')
      .then((databases) => {
        const dbList: any = [];
        for (let i = 0; i < databases.rows.length; i += 1) {
          const curName = databases.rows[i].datname;
          if (
            curName !== 'postgres' &&
            curName !== 'template0' &&
            curName !== 'template1'
          )
            dbList.push(databases.rows[i].datname);
          
      }
      resolve(dbList);
    });
  });

// gets all tablenames from currentschema
const getDBLists = () => {
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  return new Promise((resolve) => {
    pool.query(query).then((tables) => {
      const tableList: any = [];
      for (let i = 0; i < tables.rows.length; i += 1) {
        tableList.push(tables.rows[i].table_name);
      }
      resolve(tableList);
    });
  });
};

/**
 *  ********************************************************* MAIN QUERY FUNCTIONS *************************************************
 */

// let myobj: Object;
// myobj = {};

let myobj: {
  query: Function;
  changeDB: Function;
  getLists: Function;
  createKeyObject: Function;
  dropKeyColumns: Function;
  addNewKeyColumns: Function;
  getSchemaLayout: Function;
  addPrimaryKeyConstraints: Function;
  addForeignKeyConstraints: Function;
};

// eslint-disable-next-line prefer-const
myobj = {
  // Run any query
  query: (text, params, callback) => {
    console.log('Executed query: ', text);
    return pool.query(text, params, callback);
  },
  // Change current DB
  changeDB: (dbName: string) => {
    PG_URI = `postgres://postgres:postgres@localhost:5432/${dbName}`;
    pool = new Pool({ connectionString: PG_URI });
    console.log('Current URI: ', PG_URI);
    return dbName;
  },
  // Returns a listObj that contains all tablenames form current schema and all database names ( using two helpful functions)
  getLists: () =>
    new Promise((resolve) => {
      const listObj: any = {
        tableList: [], // current database's tables
        databaseList: [],
      };
      Promise.all([getDBNames(), getDBLists()]).then((data) => {
        // console.log('models on line 126: ', data);
        [listObj.databaseList, listObj.tableList] = data;
        resolve(listObj);
      });
    }),
  /** Expand to view explaination
   * Creating a nested Object, the keys within the object are the table names
   * The value is an object that has two keys that are objects
   * The primaryKeyColumns holds the column name of the primary key and has a value of true
   * The foreignKeyColumns holds multiple key value pairs where the keys are the foreign key column names
   * from the primary table and values are the primary table name that's referenced
   *
   *          keyObject = {
   *             tableName: {
   *                 primaryKeyColumns: {
   *                   primaryKeyColumnName: true,
   *                 },
   *                 foreignKeyColumns: {
   *                   foreignKeyColumnName: primaryTableOfForeignKey,
   *                   foreignKeyColumnName: primaryTableOfForeignKey,
   *                 }
   *             }
   *          }
   */
  createKeyObject: () =>
    new Promise((resolve) => {
      // initialize the keyObject we eventually want to return out
      const keyObject: any = {};
      pool
        .query(getPrimaryKeys)
        .then((result) => {
          let tableName;
          let primaryKeyColumnName;
          // iterate over the primary key table, adding info to our keyObject
          for (let i = 0; i < result.rows.length; i += 1) {
            tableName = result.rows[i].table_name;
            primaryKeyColumnName = result.rows[i].pk_column;
            /**
* Delete once we tested this section
  // if the table is not yet initialized within the keyObject, then initialize it
  // if (!keyObject[tableName])
  // keyObject[tableName] = {
  //   primaryKeyColumns: {},
  //   foreignKeyColumns: {},
  // };
  // keyObject[tableName].primaryKeyColumns[primaryKeyColumnName] = true;
*/
            // then just set the value at the pk column name to true for later checking
            keyObject[tableName] = {
              primaryKeyColumns: { [primaryKeyColumnName]: true },
              foreignKeyColumns: {},
            };
          }
        })
        .then(() => {
          pool.query(getForeignKeys).then((result) => {
            // This query pulls from the information schema and lists each table that has a foreign key,
            // the name of the table that key points to, and the name of the column at which the foreign key constraint resides

            let foreignKeyTableName;
            let primaryTableOfForeignKey;
            // foreign key column name from foreign key table
            let fkColName;
            // iterate over the foreign key table, adding info to our keyObject
            for (let i = 0; i < result.rows.length; i += 1) {
              foreignKeyTableName = result.rows[i].foreign_table;
              primaryTableOfForeignKey = result.rows[i].primary_table;
              fkColName = result.rows[i].fk_column;
              /**
 * Delete once we tested this section
// if the table is not yet initialized within the keyObject, then initialize it
// if (!keyObject[foreignKeyTableName])
// keyObject[foreignKeyTableName] = {
//   primaryKeyColumns: {},
//   foreignKeyColumns: {},
// };
*/
              // then set the value at the fk column name to the number of rows asked for in the primary table to which it points
              keyObject[foreignKeyTableName].foreignKeyColumns[
                fkColName
              ] = primaryTableOfForeignKey;
            }
            resolve(keyObject);
          });
        });
    }),

  /** Expand to see detailed comments
   * Iterating over the passed in keyObject to remove the primaryKeyColumn and all foreignKeyColumns from table
   * 'ALTER TABLE planets DROP COLUMN _id CASCADE, DROP COLUMN foreignKeyColumnName, DROP COLUMN foreignKeyColumnName;
   *          keyObject = {
   *             tableName: {
   *                 primaryKeyColumns: {
   *                   primaryKeyColumnName: true,
   *                 },
   *                 foreignKeyColumns: {
   *                   foreignKeyColumnName: primaryTableOfForeignKey,
   *                   foreignKeyColumnName: primaryTableOfForeignKey,
   *                 }
   *             }
   *          }
   */
  dropKeyColumns: async (keyObject: any) => {
    // define helper function to generate and run query
    const generateAndRunDropQuery = (table: string) => {
      let queryString = `ALTER TABLE ${table}`;
      // let count: number = 0;
      const primaryKeyColumnName = Object.keys(
        keyObject[table].primaryKeyColumns
      )[0];

      /**
       * Object.keys(keyObject[table].primaryKeyColumns).forEach((pkc) => {
       *   if (count > 0) queryString += ',';
       *   queryString += ` DROP COLUMN ${pkc} CASCADE`;
       *   count += 1;
       * });
       */
      queryString += ` DROP COLUMN ${primaryKeyColumnName} CASCADE`;

      Object.keys(keyObject[table].foreignKeyColumns).forEach(
        (foreignKeyColumnName) => {
          // if (count > 0) queryString += ',';
          queryString += `, DROP COLUMN ${foreignKeyColumnName}`;
          // count += 1;
        }
      );
      queryString += ';';

      return Promise.resolve(pool.query(queryString));
    };

    const arrayOfObj = Object.keys(keyObject);
    for (let i = 0; i < arrayOfObj.length; i += 1) {
      await generateAndRunDropQuery(arrayOfObj[i]);
    }

    // iterate over tables, running drop queries, and pushing a new promise to promise array
    // for (const table in keyObject) {
    //   await generateAndRunDropQuery(table);
    // }
  },
  /** Expand to see detailed comments
   * Iterating over the passed in keyObject to add the primaryKeyColumn and all foreignKeyColumns to the table table
   *          keyObject = {
   *             tableName: {
   *                 primaryKeyColumns: {
   *                   primaryKeyColumnName: true,
   *                 },
   *                 foreignKeyColumns: {
   *                   foreignKeyColumnName: primaryTableOfForeignKey,
   *                   foreignKeyColumnName: primaryTableOfForeignKey,
   *                 }   }   }
   */
  addNewKeyColumns: async (keyObject: any) => {
    // define helper function to generate and run query
    const generateAndRunAddQuery = (table: string) => {
      let queryString = `ALTER TABLE ${table}`;
      // let count: number = 0;
      const primaryKeyColumnName = Object.keys(
        keyObject[table].primaryKeyColumns
      )[0];
      queryString += ` ADD COLUMN ${primaryKeyColumnName} INT`;

      // for (const pkc in keyObject[table].primaryKeyColumns) {
      //   if (count > 0) queryString += ',';
      //   queryString += ` ADD COLUMN ${pkc} INT`;
      //   count += 1;
      // }

      // for (const fkc in keyObject[table].foreignKeyColumns) {
      //   if (count > 0) queryString += ',';
      //   queryString += ` ADD COLUMN ${fkc} INT`;
      //   count += 1;
      // }

      Object.keys(keyObject[table].foreignKeyColumns).forEach(
        (foreignKeyColumnName) => {
          // if (count > 0) queryString += ',';
          queryString += `, ADD COLUMN ${foreignKeyColumnName} INT`;
          // count += 1;
        }
      );

      queryString += ';';

      return Promise.resolve(pool.query(queryString));
    };

    // iterate over tables, running drop queries, and pushing a new promise to promise array

    const arrayOfObj = Object.keys(keyObject);
    for (let i = 0; i < arrayOfObj.length; i += 1) {
      await generateAndRunAddQuery(arrayOfObj[i]);
    }
    // for (const table in keyObject) {
    //   await generateAndRunAddQuery(table);{}
    // }
  },

  /** Expand to see details
   * Returning the schema layout of the current database
   * Returns an object with two keys:
   *    The first key, 'tableNames', has a value of an array that holds the name of all the tables
   *    The second key, 'tables', has a value of an object that holds the following:
   *      Each of the table names is a key
   *      Each value is an array that represents all the columns in that table (i.e. _id, films_id, name)
   *      Each column object will have the column name key and a data info key that has additional information
   *        {
   *            tableNames: ['tableName', 'tableName']
   *            tables:   {   tableName: [ {column name}, {column name} ], tableName: [ {column name}, {column name} ]   }
   *        }
   */
  getSchemaLayout: () =>
    // initialize a new promise; we resolve this promise at the end of the last async function within the promise
    new Promise((resolve) => {
      const schemaLayout: any = {
        tableNames: [],
        // tableName: [columnObj array]
        tables: {},
      };
      pool
        // This query returns the names of all the tables in the database
        .query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        )
        .then((tables) => {
          const promiseArray: any = [];

          // then we save the table names into the schemaLayout object in the tableNames property
          for (let i = 0; i < tables.rows.length; i += 1) {
            const tableName = tables.rows[i].table_name;
            schemaLayout.tableNames.push(tableName);
            promiseArray.push(getColumnObjects(tableName));
          }

          // Delete if working properly
          // for (const tableName of schemaLayout.tableNames) {
          //   promiseArray.push(getColumnObjects(tableName));
          // }
          // const columnObj: any = {
          //   columnName: result.rows[i].column_name,
          //   dataInfo: {
          //     data_type: result.rows[i].data_type,
          //     character_maxiumum_length: result.rows[i].character_maxiumum_length,
          //   },
          // };

          // we resolve all of the promises for the data info, and are returned an array of column data objects
          Promise.all(promiseArray).then((columnInfo) => {
            // here, we create a key for each table name and assign the array of column objects to the corresponding table name
            for (let i = 0; i < columnInfo.length; i += 1) {
              schemaLayout.tables[schemaLayout.tableNames[i]] = columnInfo[i];
            }
            resolve(schemaLayout);
          });
        })
        .catch(() => {
          console.log('error in models.ts');
        });
    }),

  /**
   * Check to see if there is a better way to generate Dummy Data and discuss what to do with these methods.
   */
  addPrimaryKeyConstraints: async (keyObject, dummyDataRequest) => {
    // iterate over table's keyObject property, add primary key constraints
    for (const tableName of Object.keys(dummyDataRequest.dummyData)) {
      if (keyObject[tableName]) {
        if (Object.keys(keyObject[tableName].primaryKeyColumns).length) {
          let queryString: string = `ALTER TABLE ${tableName} `;
          let count: number = 0;

          for (const pk in keyObject[tableName].primaryKeyColumns) {
            if (count > 0) queryString += `, `;
            queryString += `ADD CONSTRAINT "${tableName}_pk${count}" PRIMARY KEY ("${pk}")`;
            count += 1;
          }

          queryString += `;`;
          // wait for the previous query to return before moving on to the next table
          await pool.query(queryString);
        }
      }
    }
  },
  addForeignKeyConstraints: async (keyObject, dummyDataRequest) => {
    // iterate over table's keyObject property, add foreign key constraints
    for (const tableName of Object.keys(dummyDataRequest.dummyData)) {
      if (keyObject[tableName]) {
        if (Object.keys(keyObject[tableName].foreignKeyColumns).length) {
          let queryString: string = `ALTER TABLE ${tableName} `;
          let count: number = 0;

          for (const fk in keyObject[tableName].foreignKeyColumns) {
            const primaryTable: string =
              keyObject[tableName].foreignKeyColumns[fk];
            const primaryKey: any = Object.keys(
              keyObject[primaryTable].primaryKeyColumns
            )[0];
            if (count > 0) queryString += `, `;
            queryString += `ADD CONSTRAINT "${tableName}_fk${count}" FOREIGN KEY ("${fk}") REFERENCES ${primaryTable}("${primaryKey}")`;
            count += 1;
          }

          queryString += `;`;
          // wait for the previous query to return before moving on to the next table
          await pool.query(queryString);
        }
      }
    }
  },
};

module.exports = myobj;
