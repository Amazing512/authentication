import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { parseCookies } from "nookies";

//withSSRGuest é uma **high-order function**; uma função que recebe ou retorna outra função
//getServerSideProps espera receber uma função, portanto o tipo de retorno de withSSRGuest é uma função.
export function withSSRGuest<P>(fn: GetServerSideProps<P>): GetServerSideProps { 
  return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(context);

    if (cookies["nomeApp.token"]) {
      //Se o usuário estiver logado redireciona pra dashboard
      return {      
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }

      return await fn(context);
  }
}