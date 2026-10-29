import { apiRequest } from '../apiRequest';
import { User } from '../types/user';

type RegisterUserRequest = {
  email: string;
  password: string;
};

export const registerUser = async (input: RegisterUserRequest): Promise<User> => {
  try {
    return await apiRequest<User>('/users/register', {
      method: 'POST',
      body: {
        email: input.email,
        password: input.password,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('409')) {
      throw new Error('User with this email already exists', { cause: error });
    }
    throw new Error('Registration error', { cause: error });
  }
};
