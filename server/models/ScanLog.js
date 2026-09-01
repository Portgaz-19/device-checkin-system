import mongoose from 'mongoose';

   const scanLogSchema = new mongoose.Schema(
     {
       device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
       location: { type: String, required: true },
       action: { type: String, enum: ['checked-in', 'checked-out'], required: true },
     },
     { timestamps: true }
   );

   export default mongoose.model('ScanLog', scanLogSchema);