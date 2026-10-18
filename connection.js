const mydb = require('./mydb/mydb')

const {ENDPOINT_DB,USER_DB,PASS_DB,DATABASE} = process.env

const db = mydb.createConnection({host:ENDPOINT_DB,username:USER_DB,password:PASS_DB,database:DATABASE})

module.exports=db
