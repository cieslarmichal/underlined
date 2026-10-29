import { HeadObjectCommand, ListObjectsV2Command, type PutObjectCommandInput, type S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { type Readable } from 'node:stream';

export interface UploadFilePayload {
  readonly fileName: string;
  readonly bucketName: string;
  readonly data: Readable;
  readonly contentType: string;
  readonly attachmentName?: string;
}

export interface UploadFileResult {
  readonly location: string;
}

export interface GetFilesPayload {
  readonly prefix: string;
  readonly bucketName: string;
}

export interface GetFilesResult {
  readonly files: { name: string; contentType: string }[];
}

export class S3Service {
  private readonly s3Client: S3Client;

  public constructor(s3Client: S3Client) {
    this.s3Client = s3Client;
  }

  public async uploadBlob(payload: UploadFilePayload): Promise<UploadFileResult> {
    const { bucketName, fileName, data, contentType, attachmentName } = payload;

    const putObjectInput: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: fileName,
      Body: data,
      ContentType: contentType,
      ACL: 'public-read',
    };

    if (attachmentName) {
      putObjectInput.ContentDisposition = `attachment; filename=${attachmentName}`;
    }

    const upload = new Upload({
      client: this.s3Client,
      params: putObjectInput,
    });

    const { Location } = await upload.done();

    return { location: Location as string };
  }

  public async getFiles(payload: GetFilesPayload): Promise<GetFilesResult> {
    const { prefix, bucketName } = payload;

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    const result = await this.s3Client.send(command);

    if (!result.Contents) {
      return { files: [] };
    }

    const files = await Promise.all(
      result.Contents.map(async (data) => {
        const name = data.Key as string;

        const metadata = await this.s3Client.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: name,
          }),
        );

        return { name, contentType: metadata.ContentType as string };
      }),
    );

    return { files };
  }
}
