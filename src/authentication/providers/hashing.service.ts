import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt'

@Injectable()
export class HashingService {
    public async hashPassword(data: string | Buffer): Promise<string> {
        const salt = await bcrypt.genSalt(10)
        return bcrypt.hash(data, salt)
    }

    public async comparePassword(data: string | Buffer, encrypted: string) {
        return bcrypt.compare(data, encrypted)
    }
}
