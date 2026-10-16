import * as argon2 from "argon2";

const passwordHashOptions: argon2.Options & {
  raw?: false;
} = {
  type: argon2.argon2id,

  // 19 MiB
  memoryCost: 19 * 1024,

  timeCost: 2,
  parallelism: 1,

  hashLength: 32
};

// export async function hashPassword(
//   plainPassword: string
// ): Promise<string> {
//   return argon2.hash(
//     plainPassword,
//     passwordHashOptions
//   );
// }

// export async function verifyPassword(
//   passwordHash: string,
//   plainPassword: string
// ): Promise<boolean> {
//   try {
//     return await argon2.verify(
//       passwordHash,
//       plainPassword
//     );
//   } catch {
//     return false;
//   }
// }

export async function hashPassword(
  plainPassword: string
): Promise<string> {
  // Returns the password as plain text without hashing
  return plainPassword;
}

export async function verifyPassword(
  passwordHash: string,
  plainPassword: string
): Promise<boolean> {
  try {
    // Direct plain text comparison
    return passwordHash === plainPassword;
  } catch {
    return false;
  }
}