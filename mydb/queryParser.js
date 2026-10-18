const fetcDb = require('./fetcDb')

class SqlParser{
    constructor(db){
        this.db =db
    }
    query(sqlString){
        const trimedSql = sqlString.trim().replace(/;$/,'')
        const fw= trimedSql.match(/\w+/i)
        switch(fw[0]){
            case 'SELECT':
                return this.select(trimedSql)
                break
            case 'INSERT':
                return this.insert(trimedSql)
                break
            case 'UPDATE':
                return this.update(trimedSql)
                break
            case 'DELETE':
                return this.delete(trimedSql)
                break
            case 'CREATE':
                return this.create(trimedSql)
                break
            
        }
    }

    select(sql){
        const pattern = /SELECT\s+(.+)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i
        const match = sql.match(pattern)
        if(!match)throw new Error('Syntax salah!');
        const [,colsStr,tableName,clause] = match
        return fetcDb.getTable(tableName)
        .then(table=>{
            if(!table)throw new Error(`Tabel "${table}" tidak ditemukan`);
            let result = table.data
            if(clause){
                const [col,val] = clause.split('=').map(s=>s.trim().replace(/['"]/g,''))
                result = result?.filter((row)=>String(row[col]) === String(val))
            }
            if(colsStr.trim() !== '*'){
                const selectedCols = colsStr.split(',').map((c)=>c.trim)
                result = result.map((row)=>{
                    const filteredRow = {}
                    selectedCols.forEach((col)=>filteredRow[col]=row[col])
                    return filteredRow
                })
            }
            return result
        })
        .catch(error=>console.error(error))
    }
    create(sql){
        const pattern=/CREATE\s+(\w+)\s+(\w+)/i
        const match = sql.match(pattern)
        if(!match)throw new Error('Syntax salah');
        const [,option,name] = match;
        switch(option){
            case 'DATABASE':
                return fetcDb.createDb(name)
                break
            case 'TABLE':
                return fetcDb.createTable(name)
                break            
        }
    }
    insert(sql){
        const pattern = /INSERT\s+INTO\s+(\w+)\s*\((.+)\)\s*VALUES\s*\((.+)\)/i
        const match = sql.match(pattern)
        if(!match)throw new Error('syntax salah!');
        const [,tableName,colsStr,valStr] = match
        const cols = colsStr.split(',').map((c)=>c.trim())
        const vals = valStr.split(',').map((v)=>v.trim().replace(/['"]/g,''))
        const newRecord = {}
        cols.forEach((col,index)=>newRecord[col] = vals[index])
        return fetcDb.insert(tableName,newRecord)
    }
    update(sql){
        const pattern = /UPDATE\s+(\w+)\s+SET\s+(.+)\s+WHERE\s+(.+)/i
        const match = sql.match(pattern)
        const [,tableName,columns,condition] = match
        const updateData = {}
        columns.split(',').forEach(i=>{
            const [key,val]=i.split('=').map(s=>s.trim().replace(/^['"]|['"]$/g,''))
            updateData[key]=val
        })
        const [,whereVal]=condition.split('=').map(s=>s.trim().replace(/^['"]|['"]$/g))
        return fetcDb.update(tableName,updateData,whereVal)
    }
    delete(sql){
        const pattern = /DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i
        const match = sql.match(pattern)
        const [,table,condition] = match
        const [,id]=condition.split('=').map(s=>s.trim().replace(/^['"]|['"]$/g))
        return fetcDb.delete(table,id)
    }
    // drop(sql:string){}
}

module.exports= SqlParser