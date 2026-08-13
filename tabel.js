import fs from 'fs'
class Tabel {
    constructor(name){
        this.name = name
        this.filePath = this.filePath || `${name}_data.json`
        this.columns = []
        this.rows = []
        this._loadFromFile()
    }
    buatTabel(nama,tipe,req=false,pk=false){
        this.columns.push({
            nama,
            tipe : tipe.toUpperCase(),
            req,
            pk
        })
        return this
    }
    tambah(dataObj){
        const pkCol = this.columns.find(c=>c.pk)
        if(pkCol && !dataObj[pkCol.nama]) throw new Error(`Primery key '${pkCol.nama}' wajib diisi`)
        this.rows.push(dataObj)
        this._autoSave()
        console.log(dataObj)
        return dataObj
    }
    baca(predikat = null){
        if(!predikat) return this.rows
        return this.rows.filter(predikat)
    }
    temukanId(id){
        const pkCol = this.columns.find(c=>c.pk) || {nama:'id'}
        return this.rows.filter(row=>row[pkCol.nama] === id)||null
    }
    ubah(id,fileUbah){
        const pkCol = this.columns.find(c=>c.pk) || {nama : 'id'}
        const index = this.rows.findIndex(row=>row[pkCol.nama]) === id
        if (index === -1){
            console.log(`ID '${id}' tidak ada`)
            return false
        }
        this.rows[index] = {...this.rows[index],...fileUbah}
        return this.rows[index]
    }
    hapus(id){
        const pkCol = this.columns.find(c=>c.pk) || {nama:'id'}
        const initialLength = this.rows.length

        this.rows = this.rows.filter(row=>row[pkCol.nama]!== id)
        if(this.rows.length < initialLength){
            return true
        }
        return false
    }

    _autoSave(){fs.writeFileSync(this.filePath,JSON.stringify(this.rows,null,2),'utf8')}
    _loadFromFile(){
        if(fs.existsSync(this.filePath)){
            try {
                const fileData=fs.readFileSync(this.filePath,'utf8')
            } catch (error) {
                this.rows = []
            }
        }
    }
}