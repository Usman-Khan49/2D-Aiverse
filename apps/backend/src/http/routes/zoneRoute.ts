import { Router,Response,Request } from "express";  


export const zoneRoute = Router();

  
zoneRoute.get('/zones', (req:Request,res:Response)=>{
    res.json({ zones: [] });
})

zoneRoute.post('/zones', (req:Request,res:Response)=>{
    res.json({ message: 'Zone created' });
})

zoneRoute.get('/zones/:zoneId', (req:Request,res:Response)=>{   
    const { zoneId } = req.params;
    res.json({ zoneId, name: 'Example Zone' });
})

zoneRoute.patch('/zones/:zoneId', (req:Request,res:Response)=>{
    const { zoneId } = req.params;
    res.json({ zoneId, message: 'Zone updated' });
})

zoneRoute.delete('/zones/:zoneId', (req:Request,res:Response)=>{
    const { zoneId } = req.params;
    res.json({ zoneId, message: 'Zone deleted' });
})