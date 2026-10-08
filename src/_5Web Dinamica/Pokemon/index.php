<?php include __DIR__ . '/header.php'; ?>
<h1>Busca un Pokémon</h1>
<form action="resultado.php" method="POST">
    <label for="nombre">Nombre o número</label>
    <input type="text" id="nombre" name="nombre" placeholder="Ejemplo: pikachu o 25" required>
    <button type="submit">Buscar</button>
</form>
<?php include_once __DIR__ . '/footer.php'; ?>
