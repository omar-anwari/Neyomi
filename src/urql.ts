import { Client, cacheExchange, fetchExchange } from 'urql';
import { authExchange } from '@urql/exchange-auth';
import {
  getAccessToken,
  getTokens,
  setTokens,
  clearTokens,
  isAccessTokenExpired,
} from './auth';
import { RefreshTokenMutation } from './operations';

export const client = new Client({
  url: '/api/graphql',
  preferGetMethod: false,
  exchanges: [
    cacheExchange,
    authExchange(async (utils) => ({
      addAuthToOperation(operation) {
        const token = getAccessToken();
        if (!token) return operation;
        return utils.appendHeaders(operation, {
          Authorization: `Bearer ${token}`,
        });
      },
      willAuthError() {
        return isAccessTokenExpired();
      },
      didAuthError(error) {
        return error.graphQLErrors.some((e) => /Unauthorized/i.test(e.message));
      },
      async refreshAuth() {
        const tokens = getTokens();
        if (!tokens?.refreshToken) {
          clearTokens();
          return;
        }
        const result = await utils.mutate(RefreshTokenMutation, {
          refreshToken: tokens.refreshToken,
        });
        const accessToken = result.data?.refreshToken?.accessToken;
        if (accessToken) {
          setTokens({ accessToken, refreshToken: tokens.refreshToken });
        } else if (!result.error?.networkError) {
          clearTokens();
        }
      },
    })),
    fetchExchange,
  ],
});
