# PHP with CLion using compilation database

1. Install compiledb:

```bash
yay -S compiledb
```

OR

```bash
pip install compiledb
```

2. Clone PHP:

```bash
git clone https://github.com/php/php-src.git
```

3. CD into the php-src and create buildconf:

```bash
./buildconf
```

4. Configure:

```bash
./configure --enable-cgi \
         --enable-fpm \
         --with-fpm-systemd \
         --with-fpm-acl \
         --with-fpm-user=http \
         --with-fpm-group=http \
         --enable-embed=shared
```

5. Create compiledb:

```
compiledb make -j24
```

6. Open project in CLion as compilation database project
