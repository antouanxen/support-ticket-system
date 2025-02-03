import { Bucket, Storage } from '@google-cloud/storage';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidV4 } from 'uuid'
import { UploadedFile } from '../interface/UploadedFile.interface';
import prisma from 'prisma/prisma_Client';

@Injectable()
export class FileManagerService {
    constructor() {}

    public async fileUpload(file: Express.Multer.File) {
        const storage: Storage = new Storage({
            keyFilename: process.env.GOOGLE_APP_CREDENTIALS
        })

        const bucket: Bucket = storage.bucket('ticket-support-system')
        const uniqueFileName = this.generateFileName(file)
        const blob = bucket.file(uniqueFileName)

        const stream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        })

        console.log(`uploading file: ${uniqueFileName}`)

        return new Promise((resolve, reject) => {
            stream.on('finish', async () => {
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`
                console.log(`file uploaded successfully: ${publicUrl}`)
                await blob.makePublic()
                resolve(publicUrl)
            })

            stream.on('error', (err) => {
                console.log('upload failed:', err)
                reject(err)
            })
            stream.end(file.buffer)
        })
    }

    private generateFileName(file: Express.Multer.File): string {
        const name = file.originalname.split('.')[0].replace(/\s/g, '').trim()

        const extension = file.originalname.split('.').pop()

        const timestamp = Date.now()

        return `${this.defineFilePaths(extension)}/${name}-${timestamp}-${uuidV4()}.${extension}`
    }
    

    private defineFilePaths(extension: string): string {
        let folder = ''

        if (['pdf'].includes(extension)) {
            folder = 'files'
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
            folder = 'images'
        } else folder = 'others'

        return folder
    }

    public async savingFilesToPg(file: Express.Multer.File) {   
        try {
            const publicUrl = await this.fileUpload(file)
            const fileSizeInMb = Number.parseFloat((file.size / (1024 * 1024)).toFixed(2))

            const uploadedFile: UploadedFile = {
                file_name: file.originalname,
                publicUrl: publicUrl as string,
                file_type: file.mimetype,
                file_size: fileSizeInMb,
                createdDate: new Date()
            }

            const newFile = await prisma.file.create({
                data: uploadedFile
            }) 

            return newFile
        } catch (err: any) {
            console.log('A problem creating that file', err);
            throw new InternalServerErrorException('There was a problem creating that file in the database. Try again.')
        }
    }
}
