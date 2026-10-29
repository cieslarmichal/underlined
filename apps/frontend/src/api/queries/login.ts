import { apiRequest } from '../apiRequest';

type LoginUserRequest = {
  email: string;
  password: string;
};

type LoginUserResponse = {
  accessToken: string;
};

export const loginUser = async (input: LoginUserRequest): Promise<LoginUserResponse> => {
  return apiRequest<LoginUserResponse>('/users/login', {
    method: 'POST',
    body: {
      email: input.email,
      password: input.password,
    },
  });
};
