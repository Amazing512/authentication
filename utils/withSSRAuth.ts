import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { destroyCookie, parseCookies } from "nookies";
import { AuthTokenError } from "../services/errors/AuthTokenError";
import decode from 'jwt-decode';
import { validateUserPermissions } from "./validateUserPermissions";

type WithSSRAuthOptions = {
  permissions: string[],
  roles: string[],
}

//withSSRAuth é uma **high-order function**; uma função que recebe ou retorna outra função
//getServerSideProps espera receber uma função, portanto o tipo de retorno de withSSRAuth é uma função.
export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: WithSSRAuthOptions): GetServerSideProps { 
  return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(context);
    const token = cookies['nomeApp.token'];

    if (!token) {
      //Se o usuário não estiver logado redireciona pro login
      return {      
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

  if(options !== undefined) {
    
    const user = decode<{permissions: string[], roles: string[]}>(token);

    const { permissions, roles } = options;

    const userHasValidPermissions = validateUserPermissions({user, permissions, roles});

    if(!userHasValidPermissions) {
      return {
        redirect: {
          destination: '/dashboard',
          permanent: false,
        }
      } 
    }    
  }

    try {
      return await fn(context);
    } catch (error) {
      if(error instanceof AuthTokenError)
      {
        destroyCookie(context, "nomeApp.token");
        destroyCookie(context, "nomeApp.refreshToken");
    
        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      }
      return {
        props: {} as P
      }
    }
  }
}