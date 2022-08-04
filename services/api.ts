import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { signOut } from '../contexts/AuthContext';
import { AuthTokenError } from './errors/AuthTokenError';

let isRefreshing = false;
//@ts-ignore
let failedRequestsQueue = [];

export function setupApiClient(context = undefined) {
  let cookies = parseCookies(context);

  const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: `Bearer ${cookies["nomeApp.token"]}`
    }
  });

  api.interceptors.response.use((response) => response, (error: AxiosError<any>) => {
    if(error.response?.status === 401)
    {
      if(error.response.data?.code === 'token.expired'){
        //renovar o token
        cookies = parseCookies(context);

        const {'nomeApp.refreshToken': refreshToken} = cookies;

        const originalConfig = error.config;

        if(!isRefreshing) {
          isRefreshing = true;

          api.post('/refresh', {
            refreshToken
          }).then((response) => {
            const { token } = response.data;
            setCookie(context, "nomeApp.token", token, {
              maxAge: 60 * 60 * 24 * 30, //30 days
              path: "/",
            });
            setCookie(context, "nomeApp.refreshToken", response.data.refreshToken, {
              maxAge: 60 * 60 * 24 * 30, //30 days
              path: "/",
            });

            //@ts-ignore
            api.defaults.headers["Authorization"] = `Bearer ${token}`;
            //@ts-ignore
            failedRequestsQueue.forEach(request => request.onSuccess(token));
            failedRequestsQueue = [];
          }).catch(err => {
            //@ts-ignore
            failedRequestsQueue.forEach(request => request.onFailure(err));
            failedRequestsQueue = [];

            if(process.browser)
            {
              signOut();
            }
          }).finally(() => {
            isRefreshing = false;
          });  

        }
        // else {

        // }

          
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              //@ts-ignore
              originalConfig.headers["Authorization"] = `Bearer ${token}`;

              resolve(api(originalConfig));
            },
            onFailure: (err: AxiosError<any>) => {
              reject(err);
            },
          });
        })  
      } 
      else{
        //deslogar o usuário
        if(process.browser)
        {
          signOut();
        }
        else
        {
          return Promise.reject(new AuthTokenError);
        }
      }
    }

    return Promise.reject(error);
  });

return api;
}