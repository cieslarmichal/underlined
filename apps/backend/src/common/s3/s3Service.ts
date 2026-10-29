import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  type S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { type Readable } from 'node:stream';

export interface UploadFilePayload {
  readonly fileName: string;
  readonly bucketName: string;
  readonly data: Readable;
  readonly contentType: string;
  readonly attachmentName?: string;
  readonly isPrivate?: boolean;
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

  public async uploadFile(payload: UploadFilePayload): Promise<UploadFileResult> {
    const { bucketName, fileName, data, contentType, attachmentName, isPrivate } = payload;

    const putObjectInput: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: fileName,
      Body: data,
      ContentType: contentType,
      ...(!isPrivate && { ACL: 'public-read' as const }),
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

  public async getFile(bucketName: string, fileName: string): Promise<Buffer> {
    const { Body } = await this.s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: fileName }));

    if (!Body) {
      throw new Error(`S3 object ${fileName} has no body`);
    }

    return Buffer.from(await Body.transformToByteArray());
  }

  public async deleteBlobs(bucketName: string, fileNames: string[]): Promise<void> {
    if (fileNames.length === 0) {
      return;
    }

    await this.s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: fileNames.map((fileName) => ({ Key: fileName })) },
      }),
    );
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
