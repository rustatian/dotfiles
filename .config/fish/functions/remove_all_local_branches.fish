function remove_all_local_branches
	for i in (string split ' ' (git branch --merged | grep -v \* | xargs))
		git branch -D $i
	end
end
