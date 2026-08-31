import mongoose from 'mongoose';

   const deviceSchema = new mongoose.Schema(
     {
       deviceName: { type: String, required: true, trim: true },
       serialNumber: { type: String, required: true, unique: true, trim: true },
       owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
       registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
       status: {
         type: String,
         enum: ['checked-in', 'checked-out'],
         default: 'checked-in',
       },
       lastLocation: { type: String, default: 'Not yet scanned' },
     },
     { timestamps: true }
   );

   export default mongoose.model('Device', deviceSchema);