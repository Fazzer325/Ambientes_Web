<?php
require_once __DIR__ . '/functions.php';
include __DIR__ . '/header.php';
?>
<h1>Pokémon</h1>
<form method="GET" action="resultado.php">
    <label for="pokemon">Nombre o número del Pokémon</label>
    <input type="text" id="pokemon" name="pokemon" placeholder="Escribe un Pokémon" value="<?php echo escapar($nombre); ?>" required>
    <button type="submit">Buscar</button>
</form>
<hr>
<main class="resultado">
    <?php if ($datos !== null) { ?>
        <h2>
            <?php echo escapar($datos["name"]); ?>
        </h2>

        <?php $imagen = $datos["sprites"]["front_default"] ?? null; ?>
        <?php if (is_string($imagen) && str_starts_with($imagen, "https://")) { ?>
            <img src="<?php echo escapar($datos["sprites"]["front_default"]); ?>"
                 width="150"
                 alt="<?php echo escapar($datos["name"]); ?>">
        <?php } ?>

        <p>
            Tipo: <?php echo escapar($datos["types"][0]["type"]["name"] ?? "Desconocido"); ?>
        </p>

        <p>
            Altura: <?php echo $datos["height"] / 10; ?> m
        </p>

        <p>
            Peso: <?php echo $datos["weight"] / 10; ?> kg
        </p>
    <?php } else { ?>
        <p role="alert">
            <?php echo escapar($error); ?>
        </p>
    <?php } ?>

    <a class="volver" href="index.php">Buscar otro Pokémon</a>
</main>

<?php include_once __DIR__ . '/footer.php'; ?>
