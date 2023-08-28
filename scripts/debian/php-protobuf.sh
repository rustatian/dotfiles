wget "http://pecl.php.net/get/protobuf-3.23.3.tgz"
tar -xf "protobuf-3.23.3"
cd "protobuf-3.23.3"

phpize
./configure --prefix=/usr
make -j24
sudo make install
echo 'extension=protobuf.so' > protobuf.ini 
sudo cp protobuf.ini "/etc/php/8.2/mods-available/protobuf.ini"
sudo ln -s "/etc/php/8.2/mods-available/protobuf.ini" "/etc/php/8.2/cli/conf.d/20-protobuf.ini"
