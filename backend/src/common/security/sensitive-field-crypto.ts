import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from "node:crypto";

import {
  env
} from "../../config/env.js";

export type SensitiveFieldPurpose =
  | "BANK_ACCOUNT_NUMBER"
  | "IBAN";

const ENCRYPTION_ALGORITHM =
  "aes-256-gcm";

const ENCRYPTION_VERSION = 1;

const INITIALIZATION_VECTOR_LENGTH =
  12;

const AUTHENTICATION_TAG_LENGTH =
  16;

const VERSION_LENGTH =
  1;

const encryptionKey =
  Buffer.from(
    env.BANK_ACCOUNT_ENCRYPTION_KEY,
    "base64"
  );

if (encryptionKey.length !== 32) {
  throw new Error(
    "BANK_ACCOUNT_ENCRYPTION_KEY_INVALID"
  );
}

function buildAdditionalAuthenticatedData(
  purpose: SensitiveFieldPurpose
): Buffer {
  return Buffer.from(
    `hr-management:${purpose}:v${ENCRYPTION_VERSION}`,
    "utf8"
  );
}

/**
 * Encrypts a sensitive value using AES-256-GCM.
 *
 * Stored binary structure:
 *
 * [version: 1 byte]
 * [initialization vector: 12 bytes]
 * [authentication tag: 16 bytes]
 * [ciphertext: remaining bytes]
 */
export function encryptSensitiveField(
  value: string,
  purpose: SensitiveFieldPurpose
): Buffer {
  if (!value) {
    throw new Error(
      "SENSITIVE_FIELD_VALUE_REQUIRED"
    );
  }

  const initializationVector =
    randomBytes(
      INITIALIZATION_VECTOR_LENGTH
    );

  const cipher =
    createCipheriv(
      ENCRYPTION_ALGORITHM,
      encryptionKey,
      initializationVector
    );

  cipher.setAAD(
    buildAdditionalAuthenticatedData(
      purpose
    )
  );

  const encryptedValue =
    Buffer.concat([
      cipher.update(
        value,
        "utf8"
      ),
      cipher.final()
    ]);

  const authenticationTag =
    cipher.getAuthTag();

  return Buffer.concat([
    Buffer.from([
      ENCRYPTION_VERSION
    ]),
    initializationVector,
    authenticationTag,
    encryptedValue
  ]);
}

/**
 * Decrypts a value previously created by
 * encryptSensitiveField().
 *
 * Do not include the decrypted value in logs,
 * API errors, activity logs or standard responses.
 */
export function decryptSensitiveField(
  encryptedValue: Buffer,
  purpose: SensitiveFieldPurpose
): string {
  try {
    const minimumPayloadLength =
      VERSION_LENGTH +
      INITIALIZATION_VECTOR_LENGTH +
      AUTHENTICATION_TAG_LENGTH +
      1;

    if (
      encryptedValue.length <
      minimumPayloadLength
    ) {
      throw new Error(
        "INVALID_ENCRYPTED_PAYLOAD"
      );
    }

    const version =
      encryptedValue.readUInt8(0);

    if (
      version !==
      ENCRYPTION_VERSION
    ) {
      throw new Error(
        "UNSUPPORTED_ENCRYPTION_VERSION"
      );
    }

    const initializationVectorStart =
      VERSION_LENGTH;

    const initializationVectorEnd =
      initializationVectorStart +
      INITIALIZATION_VECTOR_LENGTH;

    const authenticationTagStart =
      initializationVectorEnd;

    const authenticationTagEnd =
      authenticationTagStart +
      AUTHENTICATION_TAG_LENGTH;

    const initializationVector =
      encryptedValue.subarray(
        initializationVectorStart,
        initializationVectorEnd
      );

    const authenticationTag =
      encryptedValue.subarray(
        authenticationTagStart,
        authenticationTagEnd
      );

    const ciphertext =
      encryptedValue.subarray(
        authenticationTagEnd
      );

    const decipher =
      createDecipheriv(
        ENCRYPTION_ALGORITHM,
        encryptionKey,
        initializationVector
      );

    decipher.setAAD(
      buildAdditionalAuthenticatedData(
        purpose
      )
    );

    decipher.setAuthTag(
      authenticationTag
    );

    return Buffer.concat([
      decipher.update(
        ciphertext
      ),
      decipher.final()
    ]).toString("utf8");
  } catch {
    throw new Error(
      "SENSITIVE_FIELD_DECRYPTION_FAILED"
    );
  }
}

export function getSensitiveValueLastFour(
  value: string
): string {
  if (value.length < 4) {
    throw new Error(
      "SENSITIVE_FIELD_MINIMUM_LENGTH"
    );
  }

  return value.slice(-4);
}

export function maskSensitiveValue(
  lastFour: string | null
): string | null {
  if (!lastFour) {
    return null;
  }

  return `****${lastFour}`;
}