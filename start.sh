#/bin/bash
result=1

export NODE_ENV=production

while [ $result -ne 0 ]; do
	    node src/index.js
	        result=$?
		sleep 5
	done
