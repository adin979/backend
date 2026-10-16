
// import fs from 'fs'
import mongoose from 'mongoose';

const dynamicDbSchema = new mongoose.Schema({
    name:{type:String,required:true,unique:true},
    owner:{type:String,required:true},
    tables:[
        {
            name:String,
            cols:Array,
            rows:Array
        }
    ]
},{timestamps:true})

const CloudDatabaseModel = mongoose.model('CloudDatabase',dynamicDbSchema)

export class Database{
    constructor(name){
        this.name = name
        this.tables = []
        // this.filePath = `${name}_db.json`
        this.owner = null
        // this._loadFromFile()
        this._loadFromCloud()
    }

    static async createDatabase(dbName,ownerUserName){
        const existing = await CloudDatabaseModel.findOne({name:dbName});
        CloudDatabaseModel.findOne({name:dbName})
        // .then(data=>{
            // if(data)throw new Error(`Database ${dbName} sudah ada!`)
                if(existing)throw new Error(`Database ${dbName} sudah ada!`);
            // const filePath = `${dbName}_db.json`
            // if(fs.existsSync(filePath))throw new Error(`Database ${dbName} sudah ada`);
            const initialData = {
                name:dbName,
                owner:ownerUserName,
                tables:[]
            }
            // fs.writeFileSync(filePath,JSON.stringify(initialData,null,2),'utf8')
            const newDbDoc = new CloudDatabaseModel(initialData)
            await newDbDoc.save();
            return new Database(dbName)
        // })
    }
    async createTable(tableName){
        let table = this.getTable(tableName)
        if(!table){
            table = {
                name:tableName,
                cols:[],
                rows:[]
            }
            this.tables.push(table)
            await this._autoSave()
        }
        return this
    }

    getTable(tableName){
        return this.tables.find(t=>t.name === tableName) || null
    }

    addColl(tableName,name,type,req=false,pk=false,ai=false){
        const table = this.getTable(tableName)
        if(!table){
            throw new Error('Table '+tableName+' tidak ditemukan!')
        }
        table.cols.push({
            name:name,
            type:type,
            req:req,
            pk:pk,
            ai:ai
        })
        this._autoSave()
        return this
    }

    insert(tableName,object){
     const table = this.getTable(tableName)
     if(!table) throw new Error(`Tabel ${tableName} tidak ditemukan!`);
     const allowedcols = table.cols.map(c=>c.name)

     for(const col of table.cols){
        if(col.ai){
            if(object[col.name] === undefined || object[col.name] === null || object[col.name] === ''){
                const maxId = table.rows.reduce((max,row)=>{
                    const val = Number(row[col.name])
                    return !isNaN(val) && val > max ? val : max
                },0)
                object[col.name] = maxId + 1
            }
        }
     }

     const inputKeys = Object.keys(object)
     for(const key of inputKeys){
        if(!allowedcols.includes(key))throw new Error('field belum dibuat')
     }

     for(const col of table.cols){
        const value = object[col.name]
        if((col.req || col.pk) && (value === undefined || value === null || value  === ''))throw new Error('wajib diisi');
        if(value === undefined || value === null)continue;

        const typeMatch = col.type.match(/^([A-Z]+)(?:\((\d+)\))?$/)
        const baseType = typeMatch ? typeMatch[1]:col.type
        const maxLength = typeMatch && typeMatch[2]?parseInt(typeMatch[2],10):null

        switch(baseType){
            case 'VARCHAR':
            case 'TEXT':
            case 'STRING':
                if(typeof value !== 'string')throw new Error('harus text')
                if(maxLength && value.length > maxLength)throw new Error('kepanjangan')
                break
            case 'INT':
            case 'INTEGER':
            case 'NUMBER':
                if(typeof value !== 'number'||!Number.isInteger(value))throw new Error('harus angka')
                if(maxLength && String(Math.abs(value)).length > maxLength)throw new Error('kebanyakan')
                break
            case 'BOOL':
            case 'BOOLEAN':
                if(typeof value !== 'boolean')throw new Error('harus boolean')
        }
     }
     const pkCol = table.cols.find(c=>c.pk)
     if(pkCol && !object[pkCol.name])throw new Error(`Isi primery key ${pkCol.name}`);
     table.rows.push(object)
     this._autoSave()
     return object
    }
    search(tableName,keyword,colName=null){
        const table = this.getTable(tableName)
        if(!table)throw new Error(`Tabel ${table} tidak ditemukan`);
        const query = String(keyword).toLowerCase()
        if(colName === null){
            return table.rows.filter(r=>{
                return Object.values(r).some(v=>{
                    if(v === null || v === undefined) return false;
                    return String(v).toLowerCase().includes(query)
                })
            })
        }else{
            return table.rows.filter(r=>{
                const val = row[colName]
                if(val === null || val === undefined)return false;
                return String(val).toLowerCase().includes(query)
            })
        }
    }
    update(tableName,fk,updateObj){
        const table = this.getTable(tableName);
        if(!table)throw new Error('Tabel tidak ditemukan');
        const pkCol = table.cols.find(c=>c.pk);
        if (!pkCol) {
            throw new Error(`Tabel '${tableName}' tidak memiliki prymery key`);
        }
        const rowIndex = table.rows.findIndex(r=>String(r[pkCol.name]) === String(fk));
        if(rowIndex === -1)throw new Error(`Data dengan ID '${fk}' tidak ditemukan`);
        delete updateObj[pkCol.name];
        table.rows[rowIndex] = {...table.rows[rowIndex],...updateObj}
        this._autoSave()
        return table.rows[rowIndex]
    }
    delete(tableName,fk){
        const table = this.getTable(tableName);
        if(!table)throw new Error(`Tabel '${tableName}' tidak ditemukan`);
        const pkCol = table.cols.find(c=>c.pk)
        if(!pkCol)throw new Error(`Tabel '${tableName}' tidak memiliki primery key`);
        const initialLength = table.rows.length
        table.rows = table.rows.filter(r=>String(r[pkCol.name]) !== String(fk))
        if(table.rows.length === initialLength)throw new Error(`Data dengan ID '${fk}' tidak ditemukan`);
        this._autoSave();
        return true;
    }
    // _autoSave(){
    //     const dataToSave={
    //         name:this.name,
    //         owner:this.owner,
    //         tables:this.tables
    //     }
    //     fs.writeFileSync(this.filePath,JSON.stringify(dataToSave,null,2),'utf8')
    // }
    async _autoSave(){
        await CloudDatabaseModel.findOneAndUpdate(
            {name:this.name},
            {tables:this.tables},
            {returnDocument:'after'}
        );
    }
    async _loadFromCloud(){
        const dbDoc = await CloudDatabaseModel.findOne({name:this.name})
        if(dbDoc){
            this.owner = dbDoc.owner
            this.tables = dbDoc.tables
        }
    }
    // _loadFromFile(){
    //     if(fs.existsSync(this.filePath)){
    //         try {
    //             const fileData = fs.readFileSync(this.filePath,'utf8')
    //             const parsed = JSON.parse(fileData)

    //             if(Array.isArray(parsed)){
    //                 this.tables = parsed
    //             }else{
    //                 this.owner=parsed.owner||null
    //                 this.tables = parsed.tables || []
    //             }
    //         } catch (error) {
    //             this.tables = []
    //         }
    //     }
    // }
}