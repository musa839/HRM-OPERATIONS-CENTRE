ls -al ~/.ssh
ssh-keygen -t ed25519 -C "Musa@hrmatters.co.za" 
eval "$(ssh-agent -s)"
pbcopy < ~/.ssh/id_ed25519.pub