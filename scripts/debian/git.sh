sudo apt install make libghc-zlib-dev libcurl4-gnutls-dev libexpat1-dev libssl-dev gettext -y
wget https://github.com/git/git/archive/refs/tags/v2.42.0.tar.gz
tar -xf v2.42.0.tar.gz
cd git-2.42.0
sudo make prefix=/usr/local install -j24
sudo rm -rf git-2.42.0 v2.42.0.tar.gz
