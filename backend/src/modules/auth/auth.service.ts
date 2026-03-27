// Placeholder: business logic for authentication

export class AuthService {
  async register(_data: { name: string; email: string; password: string }): Promise<unknown> {
    // TODO: hash password, create user in DB, return JWT
    throw new Error('Not implemented');
  }

  async login(_data: { email: string; password: string }): Promise<unknown> {
    // TODO: verify credentials, return JWT
    throw new Error('Not implemented');
  }
}
