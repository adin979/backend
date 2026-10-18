const localStorage = require('../localStorage')
const host = process.env.ENDPOINT_DB
const database = process.env.DATABASE
const fetchDb={
    login(username,password){
        try {
            const options = {method:'POST',body:JSON.stringify({username:username,password:password})}
            fetchData(`${host}/api/login`,options)
            .then((result)=>{console.log(result);result.json()})
            .then((data)=>{
                localStorage.setItem('token',data.token)
            })            
        } catch (error) {
            return error
        }
    },

    createDb(dbName){
        const options = {
            method:"POST",
            body:JSON.stringify({dbName:dbName})
        }
        fetchData(`${host}/api/databases`,options)
        .then((result)=>result.json())
        .then((data)=>{
            console.log(data)
        })
    },
    createTable(tableName){
        if(!tableName)throw new Error('Nama Tabel harus diisi!');
        fetchData(`${host}/api/${database}/tables`,{
            method:'POST',
            body:{tableName:tableName}
        }).then(result=>result.json)
        .then(data=>data)
    },
    getDb(){
        if(!token)return console.log('token tidak ada')
        fetchData(`${host}/api/databases`,{
            method:"GET"
        }).then((result)=>result.json()).then((data)=>{
            try {
                console.log(data)
            } catch (error) {
                console.log(error)
            }
        })
    },

    getTable(tableName){
        return fetchData(`${host}/api/${database}/tables/${tableName}`,{method:'GET'})
        .then((res)=>(res.json()))
        .then((data)=> data)
        .catch((err)=>{throw err})
    },

    insert(tableName,object){
        try {
            return fetchData(`${host}/api/${database}/tables/${tableName}`,{
                method:'POST',
                body:JSON.stringify(object)
            }).then((res)=>res.json())
            .then((data)=>data)
            .catch(error=>{throw error})
        } catch (error) {
            
        }
    },
    update(tableName,object,id){
        return fetchData(`${host}/api/${database}/tables/${tableName}/${id}`,{
            method:'PUT',
            body:JSON.stringify(object)
        })
        .then((data)=>data.json())
        .then((result)=>result)
        .catch(error=>{throw error})
    },
    delete(tableName,id){
        return fetchData(`${host}/api/${database}/tables/${tableName}/${id}`,{
            method:'DELETE'
        })
        .then(result=>result.json())
        .then(data=>(data))
        .catch(error=>{throw error})
    }
}

const refreshToken=()=>{
        fetch(`${host}/api/refresh-token`,{
            method:'POST',
            headers:headers,
            credentials:'include'
        })
        .then((result)=>result.json())
        .then((data)=>{
            localStorage.setItem('token',data.accessToken)
            return data.accessToken
        })
    }

const fetchData=async(url,options)=>{
    let accessToken = localStorage.getItem('token')
    options.headers = {'Content-Type':'application/json',...options.headers,'Authorization':`Bearer ${accessToken}`}
    options.credentials = 'include'
    let response = await fetch(url,options)
    if(response.status === 401||response.status === 403){
        try {
            const newAccessToken = await refreshToken()
            options.headers['Authorization'] = `Bearer ${newAccessToken}`
            response = await fetch(url,options)
        } catch (error) {
            error
        }
    }
    return response
}

module.exports= fetchDb