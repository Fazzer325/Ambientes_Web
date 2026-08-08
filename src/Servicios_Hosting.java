import java.io.Serializable;
import java.time.LocalDate;
import java.util.ArrayList;

import static Mis_modulos.PaqueteModulos.*;

public class Servicios_Hosting {
    public static void main(String[] args) {
        ArrayList<CotizacionWeb> cotizaciones = (ArrayList<CotizacionWeb>) cargar("CotizacionesWeb");

        if (cotizaciones == null) {
            cotizaciones = new ArrayList<>();
            System.out.println("No hay cotizaciones guardadas.");
        }

        while (true) {
            System.out.println("""
                    --------------------------------
                    COTIZADOR DE SITIOS WEB
                    1. Nueva cotizacion
                    2. Ver cotizaciones guardadas
                    0. Salir
                    --------------------------------
                    """);

            int opcion = scanInt("Elige una opcion: ");

            switch (opcion) {
                case 1:
                    String nombre = scanString("Nombre del cliente: ");
                    boolean hosting = leerSiNo("Agregar hosting ($1500)? (y/n): ");
                    boolean dominio = leerSiNo("Agregar dominio ($600)? (y/n): ");
                    int paginas = scanInt("Cuantas paginas necesita: ");
                    boolean seo = leerSiNo("Agregar SEO ($2000)? (y/n): ");
                    boolean bdCms = leerSiNo("Agregar BD / CMS ($7000)? (y/n): ");

                    int cambiosDev = 0;
                    if (!bdCms) {
                        cambiosDev = scanInt("Cantidad de cambios por dev ($500 c/u): ");
                    }

                    CotizacionWeb cotizacion = new CotizacionWeb(nombre, hosting, dominio, paginas, seo, bdCms, cambiosDev);
                    cotizaciones.add(cotizacion);
                    guardar(cotizaciones, "CotizacionesWeb");

                    System.out.println();
                    cotizacion.mostrarResumen();
                    esperar(2, 1);
                    break;

                case 2:
                    if (cotizaciones.isEmpty()) {
                        System.out.println("No hay cotizaciones guardadas.");
                    } else {
                        for (int i = 0; i < cotizaciones.size(); i++) {
                            System.out.println("Cotizacion " + (i + 1));
                            cotizaciones.get(i).mostrarResumen();
                            System.out.println();
                        }
                    }
                    esperar(2, 1);
                    break;

                case 0:
                    return;

                default:
                    System.out.println("Opcion no valida.");
                    esperar(2, 1);
                    break;
            }
        }
    }

    public static boolean leerSiNo(String mensaje) {
        String respuesta = scanString(mensaje);
        if (respuesta.equalsIgnoreCase("y")) {
            return true;
        }
        return false;
    }

    static class CotizacionWeb implements Serializable {

        private String nombre;
        private boolean hosting;
        private boolean dominio;
        private int paginas;
        private boolean seo;
        private boolean bdCms;
        private int cambiosDev;
        private int subtotal;
        private int descuento;
        private int totalFinal;

        public CotizacionWeb(String nombre, boolean hosting, boolean dominio, int paginas, boolean seo, boolean bdCms, int cambiosDev) {
            this.nombre = nombre;
            this.hosting = hosting;
            this.dominio = dominio;
            this.paginas = paginas;
            this.seo = seo;
            this.bdCms = bdCms;
            this.cambiosDev = cambiosDev;

            calcularTotal();
        }

        public void calcularTotal() {
            subtotal = 0;

            if (hosting) {
                subtotal += 1500;
            }

            if (dominio) {
                subtotal += 600;
            }

            if (paginas > 0) {
                if (paginas <= 3) {
                    subtotal += paginas * 5000;
                } else {
                    subtotal += 3 * 5000;
                    subtotal += (paginas - 3) * 2000;
                }
            }

            if (seo) {
                subtotal += 2000;
            }

            if (bdCms) {
                subtotal += 7000;
            } else {
                if (cambiosDev > 0) {
                    subtotal += cambiosDev * 500;
                }
            }

            descuento = 0;
            if (LocalDate.now().getMonthValue() == 8) {
                descuento = subtotal * 15 / 100;
            }

            totalFinal = subtotal - descuento;
        }

        public void mostrarResumen() {
            System.out.println("--------------------------------");
            System.out.println("Nombre: " + nombre);
            System.out.println("Hosting: " + (hosting ? "$1500" : "$0"));
            System.out.println("Dominio: " + (dominio ? "$600" : "$0"));

            if (paginas <= 3) {
                System.out.println("Paginas: " + paginas + " x $5000 = $" + (paginas * 5000));
            } else {
                int extras = paginas - 3;
                int totalPaginas = (3 * 5000) + (extras * 2000);
                System.out.println("Paginas: 3 x $5000 + " + extras + " x $2000 = $" + totalPaginas);
            }

            System.out.println("SEO: " + (seo ? "$2000" : "$0"));
            System.out.println("BD / CMS: " + (bdCms ? "$7000" : "$0"));

            if (!bdCms) {
                System.out.println("Cambios por dev: " + cambiosDev + " x $500 = $" + (cambiosDev * 500));
            }

            System.out.println("Subtotal: $" + subtotal);

            if (descuento > 0) {
                System.out.println("Cupon AGOSTO (15%): -$" + descuento);
            } else {
                System.out.println("Cupon AGOSTO (15%): no aplica");
            }

            System.out.println("TOTAL FINAL: $" + totalFinal);
            System.out.println("--------------------------------");
        }
    }
}
