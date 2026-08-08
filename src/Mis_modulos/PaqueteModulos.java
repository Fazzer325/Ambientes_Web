package Mis_modulos;

import java.io.*;
import java.util.Arrays;
import java.util.Scanner;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Paquete de utilidades con funciones incluidas directamente:
 * guardado/carga de objetos, coloreado ANSI y funciones rápidas de consola.
 */
public final class PaqueteModulos {

    private static final String CARPETA = "Variables/";
    private static final Scanner scan = new Scanner(System.in);

    private PaqueteModulos() {
        // Evita instanciación
    }

    // -------------------- GUARDADO / CARGA --------------------

    public static void guardar(Object variable, String nombre) {
        File carpeta = new File(CARPETA);
        if (!carpeta.exists()) {
            carpeta.mkdir();
        }

        try (ObjectOutputStream salida = new ObjectOutputStream(new FileOutputStream(CARPETA + nombre + ".dat"))) {
            salida.writeObject(variable);
            System.out.println("Variable guardada en: " + CARPETA + nombre + ".dat");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static Object cargar(String nombre) {
        File archivo = new  File(CARPETA + nombre + ".dat");
        if (!archivo.exists()) {
            System.out.println("No se encontró el archivo: " + archivo.getAbsolutePath());
            return null;
        }

        try (ObjectInputStream entrada = new ObjectInputStream(new FileInputStream(archivo))) {
            return entrada.readObject();
        } catch (IOException | ClassNotFoundException e) {
            e.printStackTrace();
            return null;
        }
    }

    // -------------------- COLORES --------------------

    public static String azul(String texto) {
        return "\u001B[34m" + texto + "\u001B[0m";
    }

    public static String rojo(String texto) {
        return "\u001B[31m" + texto + "\u001B[0m";
    }

    public static String verde(String texto) {
        return "\u001B[32m" + texto + "\u001B[0m";
    }

    public static String amarillo(String texto) {
        return "\u001B[33m" + texto + "\u001B[0m";
    }

    public static String cyan(String texto) {
        return "\u001B[36m" + texto + "\u001B[0m";
    }

    // -------------------- FUNCIONES RÁPIDAS --------------------

    public static void saltos(int saltos) {
        System.out.println(" ".repeat(saltos));
    }

    public static void esperar(int segundos) {
        try {
            Thread.sleep(segundos * 1000L);
        } catch (InterruptedException e) {
            System.out.println("La espera fue interrumpida: " + e.getMessage());
            Thread.currentThread().interrupt();
        }
    }

    public static void esperar(int segundos, int espacios) {
        esperar(segundos);
        System.out.println("\n".repeat(Math.max(0, espacios)));
    }

    public static int scanInt(String mensaje) {
        System.out.print(mensaje);
        String entrada = scan.nextLine();
        return Integer.parseInt(entrada.trim());
    }

    public static String scanString(String mensaje) {
        System.out.print(mensaje);
        return scan.nextLine();
    }

    public static float scanFloat(String mensaje) {
        System.out.print(mensaje);
        return Float.parseFloat(scan.nextLine().trim());
    }

    public static <T> T intentar(String mensaje, Function<String, T> convertidor) {
        while (true) {
            try {
                System.out.print(mensaje + " ");
                String entrada = scan.nextLine();
                return convertidor.apply(entrada);
            } catch (Exception e) {
                System.out.println("Entrada inválida, intenta de nuevo.");
            }
        }
    }

    public static <T> T intentar(String mensaje, Function<String, T> convertidor, String[] valoresAceptados) {
        while (true) {
            try {
                System.out.print(mensaje + " ");
                String entrada = scan.nextLine().trim();

                boolean permitido = false;
                for (String v : valoresAceptados) {
                    if (entrada.equalsIgnoreCase(v.trim())) {
                        permitido = true;
                        break;
                    }
                }

                if (!permitido) {
                    System.out.println("Valor no permitido. Opciones válidas: " + String.join(", ", valoresAceptados));
                    continue;
                }

                return convertidor.apply(entrada);
            } catch (Exception e) {
                System.out.println("Entrada inválida, intenta de nuevo.");
            }
        }
    }
    public static <T> T intentar(String mensaje, Function<String, T> convertidor, int[] valoresAceptados) {
        while (true) {
            try {
                System.out.print(mensaje + " ");
                String entrada = scan.nextLine().trim();

                boolean permitido = false;
                for (int v : valoresAceptados) {
                    if (entrada.equalsIgnoreCase(String.valueOf(v))) {
                        permitido = true;
                        break;
                    }
                }

                if (!permitido) {
                    System.out.println("Valor no permitido. Opciones válidas: " + String.join(", ", Arrays.toString(valoresAceptados)));
                    continue;
                }

                return convertidor.apply(entrada);
            } catch (Exception e) {
                System.out.println("Entrada inválida, intenta de nuevo.");
            }
        }
    }

    public static <T> T intentar(Supplier<T> accion) {
        while (true) {
            try {
                return accion.get();
            } catch (Exception e) {
                System.out.println("Error: " + e.getMessage() + " — intenta de nuevo.");
            }
        }
    }

    public static void intentar(Runnable accion) {
        int i = 0;
        while (true) {
            try {
                accion.run();
                return;
            } catch (Exception e) {
                System.out.println("Error: " + e.getMessage() + " — intenta de nuevo.");
                i++;
                if (i >= 3) {
                    if (scanString("El programa fallo 3 o mas vezes deseas dejar de intentarlo? ( Y / N ): ").equalsIgnoreCase("Y")) {
                        return;
                    }
                }
            }
        }
    }
}
