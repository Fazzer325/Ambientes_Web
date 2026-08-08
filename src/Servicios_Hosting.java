import java.util.ArrayList;

import static Mis_modulos.PaqueteModulos.*;

public class Servicios_Hosting {
    public static void main(String[] args) {

        ArrayList<HostCreado> Hosteos;
        try {

            Hosteos = (ArrayList<HostCreado>) cargar("Hosts");
        }
        catch (Exception e) {
            System.out.println("!!--- No existen Hosteos Antiguos ---!!");
        }

        while (true){
            System.out.println("""
                    -- Servicios Hosting Fazstar --
                    Elija una opcion: 
                    1° Rentar
                    2° Que Ofrecemos
                    3° Cambios
                    0° Salir
                    """);
            int opc =scanInt("Elije una Opcion: ");

            switch (opc){
                case 1:
                    String Nombre = scanString("Ingrese su Nombre: ");
                    String Contraseña = scanString("Ingrese una contraseña: ");
                    boolean Host;
                    String a = scanString("Quiere Servicios de Hosteo? ( y/n )");
                    if (a.equals("y")){
                        Host  = true;
                    }
                    else{
                    Host = false;
                    }
                    boolean Dominio;
                    String b = scanString("Quiere Servicios de Hosteo? ( y/n )");
                    if (a.equals("y")){
                        Dominio  = true;
                    }
                    else{
                        Dominio = false;
                    }
                    int PgExtras = scanInt("Cantidad de paginas extras: ");



                    break;


                case 2:
                    System.out.println("""
                            Somos una empresa mexicana que busca dar el mejor servicio para su hosting web
                            contamos con una gran cantidad de herramientas y mantenimiento frecuente a nuestros clientes
                            Si busca un Hosteo de confiansa puede contar con Fazstar.""");
                    esperar(5,3);
                    break;

                case 0:
                    return;
            }
        }
    }

    static class HostCreado {
        private String Dueño;
        private String PSW;
        private boolean Host;
        private boolean Dominio;
        private int PgExtra;
        private boolean SEO;
        private boolean BD;
        private int Total;
        private int Cambios;

        public HostCreado(String dueño, String psw, boolean host, boolean dominio, int pgextra, boolean seo, boolean bd, int total){
            this.Dueño = dueño;
            this.PSW = psw;
            this.Host = host;
            this.Dominio = dominio;
            this.PgExtra = pgextra;
            this.SEO = seo;
            this.BD = bd;
            this.Total = total;
        }

        public String getDueño() {
            return Dueño;
        }

        public String getPSW() {
            return PSW;
        }

        public void Cambio(int cant){
            Total=+ 500*cant;

            System.out.println("Total: "+Total);
        }

        public void Info(){
            System.out.println("-- Host Info --");
            System.out.println(
                    "Dueño: "+this.Dueño+
                    "Contraseña: "+this.PSW +
                    "Host: "+this.Host +
                    "Dominio: "+this.Dominio+
                    "Paguinas Extra: "+this.PgExtra+
                    "SEO: "+this.SEO+
                    "Base de Datos: "+this.BD+
                    "Total: "+this.Total
            );
        }

    }
}
